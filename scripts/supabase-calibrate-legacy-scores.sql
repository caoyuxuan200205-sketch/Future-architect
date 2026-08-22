-- 已执行过排行榜主脚本的数据库：运行本文件，为历史估算记录补充稳定的模拟论文分与成就分。
-- 幂等：模拟值只由 game_id 和已有数据决定，重复执行结果不变。

create or replace function public.legacy_hash_bucket_v1(p_key text, p_salt text, p_modulus integer)
returns integer language sql immutable as $$
  select case when p_modulus <= 0 then 0
    else mod(hashtextextended(coalesce(p_key,'legacy')||':'||p_salt,0) & 2147483647::bigint,p_modulus)::integer
  end;
$$;

create or replace function public.calibrate_legacy_scores_v1()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  row_data record;
  raw_thesis numeric;
  thesis_points numeric;
  thesis_estimated boolean;
  achievement_points integer;
  internship_points numeric;
  completion_points numeric;
  experience_points numeric;
  career_points numeric;
  ability_points numeric;
  survival_points numeric;
  raw_total numeric;
  multiplier numeric;
  final_total numeric;
  company_difficulty numeric;
  high_stat_count integer;
  offer_bonus integer;
  early boolean;
  updated_count integer:=0;
begin
  for row_data in
    select ctid,* from public.game_results
    where season_id='2026-S1' and score_version=1 and is_estimated=true and final_stats is not null
  loop
    raw_thesis:=score_stat_v1(row_data.final_stats,'thesisScore');
    thesis_estimated:=coalesce(
      (row_data.score_breakdown->>'thesisEstimated')::boolean,
      raw_thesis<=0
    );
    early:=row_data.ending_id in ('expelled','self_doubt_quit','age_anxiety_pivot','stress_breakdown');
    select coalesce(score_company_difficulty_v1(thresholds),0) into company_difficulty
      from public.score_offer_catalog_v1 where id=row_data.offer_id;
    company_difficulty:=coalesce(company_difficulty,0);

    if thesis_estimated then
      raw_thesis:=case
        when early then 25+legacy_hash_bucket_v1(row_data.game_id,'thesis-early',26)
        when row_data.ending_title='延毕' then 45+legacy_hash_bucket_v1(row_data.game_id,'thesis-delay',15)
        when row_data.route_id='architecture' then 70+legacy_hash_bucket_v1(row_data.game_id,'thesis-architecture',19)
        when row_data.offer_id is not null and company_difficulty>=0.9 then 68+legacy_hash_bucket_v1(row_data.game_id,'thesis-top',19)
        when row_data.offer_id is not null then 62+legacy_hash_bucket_v1(row_data.game_id,'thesis-offer',21)
        else 55+legacy_hash_bucket_v1(row_data.game_id,'thesis-normal',16)
      end;
    end if;
    raw_thesis:=least(100,greatest(0,raw_thesis));
    thesis_points:=score_thesis_v1(raw_thesis);

    select count(*) into high_stat_count
    from unnest(array['arch','logic','expression','english','structured','dataSense','codeBasic','visualTaste','writingDepth','aestheticTheory','commercial','industryResearch','negotiation','leadership','empathy','execution','fastLearning','alignment']) as stat_keys(stat_key)
    where score_stat_v1(row_data.final_stats,stat_key)>=80;
    offer_bonus:=case when row_data.offer_id is null then 0 when company_difficulty>=0.9 then 4 when company_difficulty>=0.6 then 3 else 2 end;
    achievement_points:=least(18,
      3
      +least(6,greatest(0,coalesce(row_data.internship_count,0))*2)
      +offer_bonus
      +least(3,high_stat_count)
      +(case when coalesce((row_data.score_breakdown->>'survival')::numeric,0)>=90 then 1 else 0 end)
      +legacy_hash_bucket_v1(row_data.game_id,'achievement',3)
    );

    career_points:=coalesce((row_data.score_breakdown->>'career')::numeric,0);
    ability_points:=coalesce((row_data.score_breakdown->>'ability')::numeric,0);
    survival_points:=coalesce((row_data.score_breakdown->>'survival')::numeric,0);
    internship_points:=coalesce((row_data.score_breakdown->>'internship')::numeric,least(50,greatest(0,coalesce(row_data.internship_count,0))*13));
    completion_points:=coalesce((row_data.score_breakdown->>'completion')::numeric,20*coalesce(row_data.turns_completed,24)/24.0);
    experience_points:=least(100,internship_points+achievement_points+completion_points);
    multiplier:=coalesce((row_data.score_breakdown->>'earlyEndingMultiplier')::numeric,case when early then 0.75 else 1 end);
    raw_total:=career_points+ability_points+thesis_points+survival_points+experience_points;
    final_total:=least(820,round(raw_total*multiplier,2));

    update public.game_results set
      final_stats=jsonb_set(coalesce(final_stats,'{}'::jsonb),'{thesisScore}',to_jsonb(round(raw_thesis,2)),true),
      score_total=final_total,
      score_breakdown=coalesce(score_breakdown,'{}'::jsonb)||jsonb_build_object(
        'thesis',round(thesis_points,2),'experience',round(experience_points,2),'achievement',achievement_points,
        'rawTotal',round(raw_total,2),'finalTotal',final_total,'isEstimated',true,
        'achievementEstimated',true,'thesisEstimated',thesis_estimated,'legacyScoreCap',820,
        'estimatedAssumptions',jsonb_build_object(
          'initialStats','学历层级生成基线','internshipPoints','每段13分，封顶50',
          'achievementPoints','依据实习、Offer难度、能力里程碑与稳定哈希模拟，封顶18',
          'thesisPoints',case when thesis_estimated then '依据结局、路线、Offer难度与稳定哈希模拟，最高88' else '保留历史真实论文分' end,
          'earlyEndingTurns',case when early then coalesce(row_data.turns_completed,12) else null end
        )
      )
    where ctid=row_data.ctid;
    updated_count:=updated_count+1;
  end loop;
  return jsonb_build_object('updated',updated_count,'seasonId','2026-S1','achievementCap',18,'simulatedThesisCap',88,'legacyScoreCap',820,'deterministic',true);
end;
$$;

select public.calibrate_legacy_scores_v1();

revoke all on function public.calibrate_legacy_scores_v1() from public;
revoke all on function public.legacy_hash_bucket_v1(text,text,integer) from public;
