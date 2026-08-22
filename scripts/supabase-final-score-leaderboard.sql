-- 《我是一个“建”人》V1 结局评分与排行榜
-- 在 Supabase SQL Editor 中执行一次。客户端只提交原始快照，分数由本函数重算。

alter table public.game_results
  add column if not exists ending_title text,
  add column if not exists offer_name text,
  add column if not exists mentor_name text,
  add column if not exists character_tier text,
  add column if not exists undergrad_school text,
  add column if not exists master_school text,
  add column if not exists is_overseas boolean default false,
  add column if not exists final_stats jsonb,
  add column if not exists internship_count integer default 0,
  add column if not exists anonymous_id varchar(64),
  add column if not exists game_id varchar(64),
  add column if not exists player_display_name text,
  add column if not exists ending_id text,
  add column if not exists offer_id text,
  add column if not exists route_id text,
  add column if not exists mentor_id text,
  add column if not exists initial_stats jsonb,
  add column if not exists turns_completed smallint,
  add column if not exists internship_ids jsonb,
  add column if not exists achievement_ids jsonb,
  add column if not exists score_total numeric(8,2),
  add column if not exists score_breakdown jsonb,
  add column if not exists score_version integer,
  add column if not exists season_id text,
  add column if not exists is_valid boolean default true,
  add column if not exists is_estimated boolean default false,
  add column if not exists invalid_reason text,
  add column if not exists submitted_at timestamptz default now();

create unique index if not exists game_results_game_id_unique on public.game_results (game_id);
create index if not exists game_results_leaderboard_idx on public.game_results (season_id, score_version, is_valid, score_total desc);
create index if not exists game_results_route_leaderboard_idx on public.game_results (season_id, score_version, route_id, is_valid, score_total desc);

create table if not exists public.score_offer_catalog_v1 (
  id text primary key,
  name text not null,
  category text not null,
  route_id text not null,
  salary_text text not null,
  annual_salary numeric not null default 0,
  thresholds jsonb not null
);

insert into public.score_offer_catalog_v1 (id, name, category, route_id, salary_text, thresholds) values
('tencent','腾讯','互联网大厂','internet','25k·14（月）','{"logic":75,"expression":70,"structured":70}'),
('bytedance','字节跳动','互联网大厂','internet','28k·15（月）','{"logic":77,"expression":73,"structured":70}'),
('alibaba','阿里巴巴','互联网大厂','internet','26k·15（月）','{"logic":75,"expression":70,"structured":73}'),
('jd','京东','互联网大厂','internet','23k·14（月）','{"logic":73,"expression":67,"structured":67}'),
('baidu','百度','互联网大厂','internet','22k·14（月）','{"logic":73,"expression":67,"structured":65}'),
('kuaishou','快手','互联网大厂','internet','24k·15（月）','{"logic":70,"expression":65,"structured":65}'),
('meituan','美团','互联网大厂','internet','25k·15（月）','{"logic":75,"expression":68,"structured":72}'),
('pdd','拼多多','互联网大厂','internet','30k·16（月）','{"logic":76,"expression":68,"structured":73}'),
('antgroup','蚂蚁集团','互联网大厂','internet','28k·16（月）','{"logic":78,"expression":72,"structured":75}'),
('google','Google','外企科技','foreign','50k+·14（月）','{"english":83,"logic":80,"structured":75,"expression":73}'),
('microsoft','Microsoft','外企科技','foreign','45k·14（月）','{"english":80,"logic":77,"structured":75,"expression":70}'),
('amazon','Amazon','外企科技','foreign','42k·14（月）','{"english":80,"logic":75,"structured":73,"expression":70}'),
('meta','Meta','外企科技','foreign','48k·14（月）','{"english":81,"logic":77,"structured":73,"expression":73}'),
('apple','Apple','外企科技','foreign','55k·14（月）','{"english":83,"logic":77,"structured":75,"expression":75}'),
('mckinsey','McKinsey','咨询公司','consulting','45k·16（月）','{"logic":83,"structured":83,"expression":77,"english":73}'),
('bcg','BCG','咨询公司','consulting','43k·16（月）','{"logic":81,"structured":81,"expression":77,"english":70}'),
('bain','Bain','咨询公司','consulting','42k·16（月）','{"logic":80,"structured":80,"expression":75,"english":67}'),
('deloitte','Deloitte','咨询公司','consulting','24k·14（月）','{"logic":78,"structured":77,"expression":72,"english":68}'),
('tesla','Tesla','车企','automotive','35k·14（月）','{"logic":78,"english":75,"structured":70}'),
('nio','蔚来','车企','automotive','30k·15（月）','{"logic":75,"expression":70,"structured":70}'),
('li','理想','车企','automotive','32k·15（月）','{"logic":78,"structured":75,"expression":65}'),
('xpeng','小鹏','车企','automotive','28k·14（月）','{"logic":75,"structured":75}'),
('byd','比亚迪','车企','automotive','25k·13（月）','{"logic":70,"structured":75}'),
('cicc','中金公司','投行','investment_banking','50k·16（月）','{"logic":85,"structured":80,"english":75}'),
('citic','中信证券','投行','investment_banking','45k·16（月）','{"logic":82,"structured":78,"english":70}'),
('goldman','Goldman Sachs','投行','investment_banking','80k+·16（月）','{"logic":88,"structured":85,"english":85}'),
('morgan','Morgan Stanley','投行','investment_banking','75k·16（月）','{"logic":86,"structured":83,"english":82}'),
('netease','网易','中厂','internet','21k·14（月）','{"logic":63,"expression":57,"structured":57}'),
('beike','贝壳找房','中厂','internet','20k·14（月）','{"logic":62,"expression":58,"structured":60}'),
('iflytek','科大讯飞','中厂','internet','21k·14（月）','{"logic":66,"expression":60,"structured":63}'),
('xiaohongshu','小红书','中厂','internet','22k·15（月）','{"logic":65,"expression":63,"structured":60}'),
('bilibili','哔哩哔哩','中厂','internet','20k·14（月）','{"logic":63,"expression":60,"structured":57}'),
('dewu','得物','中厂','internet','19k·14（月）','{"logic":60,"expression":57,"structured":55}'),
('ctrip','携程','中厂','internet','20k·14（月）','{"logic":61,"expression":55,"structured":57}'),
('didi','滴滴','中厂','internet','22k·14（月）','{"logic":63,"expression":55,"structured":60}'),
('iqiyi','爱奇艺','中厂','internet','19k·14（月）','{"logic":60,"expression":60,"structured":55}'),
('keep','Keep','小厂','internet','16k·14（月）','{"logic":47,"expression":45,"structured":43}'),
('soul','Soul','小厂','internet','16k·14（月）','{"logic":45,"expression":47,"structured":43}'),
('boss','Boss直聘','小厂','internet','17k·14（月）','{"logic":47,"expression":45,"structured":43}'),
('moji','墨迹天气','小厂','internet','15k·14（月）','{"logic":43,"expression":43,"structured":40}'),
('fanka','翻咔','小厂','internet','15k·13（月）','{"logic":43,"expression":47,"structured":40}'),
('mixue','蜜雪冰城','小厂','internet','16k·13（月）','{"logic":45,"expression":50,"structured":43}'),
('chayan','茶颜悦色','小厂','internet','15k·13（月）','{"logic":43,"expression":50,"structured":40}'),
('zuoyebang','作业帮','小厂','internet','17k·14（月）','{"logic":47,"expression":43,"structured":45}'),
('yuanfudao','猿辅导','小厂','internet','17k·14（月）','{"logic":47,"expression":43,"structured":45}'),
('cadg','中国建筑设计研究院','传统路径','architecture','18k·14（月）','{"arch":70}'),
('ecadi','华东建筑设计研究院','传统路径','architecture','17k·14（月）','{"arch":67}'),
('vanke','万科','传统路径','architecture','19k·14（月）','{"arch":63,"network":50}'),
('longfor','龙湖','传统路径','architecture','18k·14（月）','{"arch":60,"network":47}'),
('seu_design','东南大学建筑设计研究院','传统路径','architecture','16k·14（月）','{"arch":65}'),
('gad','gad','传统路径','architecture','17k·14（月）','{"arch":63}'),
('cushman','戴德梁行','传统路径','architecture','20k·14（月）','{"arch":55,"english":60,"network":45}'),
('cbre','世邦魏理仕','传统路径','architecture','21k·14（月）','{"arch":57,"english":62,"network":47}'),
('jll','仲量联行','传统路径','architecture','21k·14（月）','{"arch":56,"english":63,"network":47}')
on conflict (id) do update set name=excluded.name, category=excluded.category, route_id=excluded.route_id, salary_text=excluded.salary_text, thresholds=excluded.thresholds;

update public.score_offer_catalog_v1
set annual_salary = ((regexp_match(salary_text, '([0-9]+(?:\.[0-9]+)?)k'))[1]::numeric * 1000)
                  * ((regexp_match(salary_text, '·\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric);

create table if not exists public.score_internship_catalog_v1 (id text primary key, company_id text not null references public.score_offer_catalog_v1(id));
insert into public.score_internship_catalog_v1 (id, company_id) values
('intern_tencent','tencent'),('intern_tencent_pm','tencent'),('intern_tencent_ops','tencent'),
('intern_bytedance','bytedance'),('intern_bytedance_aipm','bytedance'),('intern_bytedance_content','bytedance'),
('intern_ali_product','alibaba'),('intern_ali_operation','alibaba'),('intern_meituan_strategy','meituan'),('intern_meituan_pm','meituan'),
('intern_pdd_strategy','pdd'),('intern_netease_game_pm','netease'),('intern_netease_pm','netease'),('intern_kuaishou_pm','kuaishou'),
('intern_kuaishou_ops','kuaishou'),('intern_jd_pm','jd'),('intern_microsoft_pm','microsoft'),('intern_google_pm','google'),
('intern_amazon_ops','amazon'),('intern_mckinsey_pta','mckinsey'),('intern_bcg_pta','bcg'),('intern_goldman_ibd','goldman'),
('intern_loreal_mkt','tesla'),('intern_apple_marcom','apple'),('intern_xiaohongshu','xiaohongshu'),('intern_bilibili','bilibili'),
('intern_keep','keep'),('intern_local_media','cadg'),('intern_data_entry','seu_design'),('intern_event_assist','mixue'),
('intern_edu_tutor','boss'),('intern_fanka','fanka'),('intern_chayan','chayan'),('intern_ctrip','ctrip'),('intern_didi','didi'),
('intern_iqiyi','iqiyi'),('intern_zuoyebang','zuoyebang'),('intern_yuanfudao','yuanfudao'),('intern_gad','gad'),
('intern_cushman','cushman'),('intern_tesla','tesla'),('intern_cicc','cicc'),('intern_baidu_ai_pm','baidu'),
('intern_ant_business','antgroup'),('intern_meta_uxr','meta'),('intern_bain_aci','bain'),('intern_deloitte_consulting','deloitte'),
('intern_nio_ux_ops','nio'),('intern_li_strategy','li'),('intern_xpeng_cockpit','xpeng'),('intern_byd_planning','byd'),
('intern_citic_ibd','citic'),('intern_morgan_ibd','morgan'),('intern_beike_product','beike'),('intern_iflytek_ai_pm','iflytek'),
('intern_dewu_growth','dewu'),('intern_soul_community','soul'),('intern_moji_ops','moji'),('intern_ecadi_arch','ecadi'),
('intern_vanke_design_mgmt','vanke'),('intern_longfor_commercial','longfor'),('intern_cbre_research','cbre'),('intern_jll_consulting','jll')
on conflict (id) do update set company_id=excluded.company_id;

create table if not exists public.score_achievement_catalog_v1 (id text primary key, tier text not null, points smallint not null);
insert into public.score_achievement_catalog_v1 (id,tier,points) values
('career_toilet_funnel','silver',1),('career_spatial_pm','gold',4),('career_mbb_consulting','gold',4),('career_ev_ux','gold',4),
('career_wall_street','gold',4),('career_global_nomad','gold',4),('career_leetcode_wall','silver',1),('career_offer_tsunami','diamond',6),
('career_stay_architect','silver',1),('romance_yifan_rhino','gold',4),('romance_yuchen_hotnerd','gold',4),('romance_baixu_puppy','gold',4),
('romance_jianghuai_gym','gold',4),('romance_qinghuai_moon','gold',4),('romance_mentor_forbidden','diamond',6),('romance_harem_master','diamond',6),
('romance_shura_survivor','silver',1),('romance_wechat_bomb','bronze',2),('romance_pure_love','gold',4),('acad_blackmail_medal','gold',4),
('acad_huafie_thesis','silver',1),('acad_midnight_emoticon','silver',1),('acad_fengshui_master','bronze',2),('acad_thesis_godfather','gold',4),
('acad_gift_connoisseur','bronze',2),('acad_earthbound_spirit','silver',1),('acad_stealth_intern','silver',1),('acad_mentor_redemption','diamond',6),
('meme_stress_collapse','bronze',2),('meme_born_in_rome','silver',1),('meme_penguin_feeder','silver',1),('meme_expelled_hero','bronze',2),
('meme_slacker_supreme','bronze',2),('meme_icu_ctrl_s','silver',1),('meme_micro_forbidden_city','bronze',2),('meme_ai_card_smoking','diamond',6),
('master_hexagonal_god','gold',4),('master_freelance_tycoon','gold',4),('master_perk_collector','gold',4),('master_iron_nerve','silver',1),
('master_delayed_emperor','silver',1),('master_cupid_god','diamond',6),('master_grand_completion','diamond',6)
on conflict (id) do update set tier=excluded.tier, points=excluded.points;

create or replace function public.score_stat_v1(p_stats jsonb, p_key text)
returns numeric language sql immutable as $$
  select least(100, greatest(0, coalesce(nullif(p_stats->>p_key, '')::numeric, 0)));
$$;

create or replace function public.score_company_difficulty_v1(p_thresholds jsonb)
returns numeric language sql immutable as $$
  with values as (select value::numeric v from jsonb_each_text(p_thresholds))
  select least(1, greatest(0, (avg(v)-45)/40 + 0.04*(count(*)-1))) from values;
$$;

create or replace function public.score_thesis_v1(p_score numeric)
returns numeric language sql immutable as $$
  select case
    when p_score <= 0 then 0
    when p_score <= 45 then p_score/45*50
    when p_score <= 60 then 50+(p_score-45)/15*50
    when p_score <= 70 then 100+(p_score-60)/10*25
    when p_score <= 85 then 125+(p_score-70)/15*35
    when p_score <= 100 then 160+(p_score-85)/15*20
    else 180 end;
$$;

create or replace function public.legacy_initial_stats_v1(p_tier text, p_overseas boolean)
returns jsonb language plpgsql immutable as $$
declare
  tier_no integer := case p_tier when 'TOP2' then 4 when '985/老八校' then 3 when '211 院校' then 2 else 1 end;
  tb numeric := (tier_no-1)*10;
begin
  return jsonb_build_object(
    'arch',50+tb*0.6,'logic',28+tb*0.9,'expression',22+tb*0.8,
    'english',18+tb+(case when p_overseas then 20 else 0 end),'structured',22+tb*0.8,
    'dataSense',25+tb*0.5,'codeBasic',15+tb*0.3,'visualTaste',55+tb*0.4,
    'writingDepth',35+tb*0.5,'aestheticTheory',50+tb*0.4,'commercial',20+tb*0.4,
    'industryResearch',18+tb*0.4,'negotiation',25+tb*0.3,'leadership',25+tb*0.3,
    'empathy',45+tb*0.3,'execution',45+tb*0.4,'fastLearning',35+tb*0.4,'alignment',25+tb*0.3
  );
end;
$$;

create or replace function public.estimate_legacy_score_v1(
  p_final_stats jsonb,
  p_initial_stats jsonb,
  p_offer_id text,
  p_internship_count integer,
  p_turns integer,
  p_is_early boolean
) returns jsonb language plpgsql stable set search_path=public as $$
declare
  ability_keys text[] := array['arch','logic','expression','english','structured','dataSense','codeBasic','visualTaste','writingDepth','aestheticTheory','commercial','industryResearch','negotiation','leadership','empathy','execution','fastLearning','alignment'];
  offer_row public.score_offer_catalog_v1%rowtype;
  final_avg numeric; final_top6 numeric; growth_avg numeric; growth_top6 numeric;
  final_ability numeric; growth numeric; ability numeric;
  offer_value numeric := 0; job_match numeric := 0; career numeric := 0; salary_percentile numeric := 0;
  thesis numeric; survival numeric; internship numeric; completion numeric; experience numeric;
  raw_total numeric; multiplier numeric := 1; final_total numeric;
begin
  select avg(score_stat_v1(p_final_stats,k)) into final_avg from unnest(ability_keys) k;
  select avg(v) into final_top6 from (select score_stat_v1(p_final_stats,k) v from unnest(ability_keys) k order by v desc limit 6) x;
  select avg(least(1,greatest(0,(score_stat_v1(p_final_stats,k)-score_stat_v1(p_initial_stats,k))/30))) into growth_avg from unnest(ability_keys) k;
  select avg(v) into growth_top6 from (select least(1,greatest(0,(score_stat_v1(p_final_stats,k)-score_stat_v1(p_initial_stats,k))/30)) v from unnest(ability_keys) k order by v desc limit 6) x;
  final_ability:=160*(0.65*final_top6/100+0.35*final_avg/100);
  growth:=100*(0.60*growth_top6+0.40*growth_avg);
  ability:=final_ability+growth;

  if p_offer_id is not null then
    select * into offer_row from public.score_offer_catalog_v1 where id=p_offer_id;
    if found then
      select count(*)::numeric/nullif((select count(*) from public.score_offer_catalog_v1),0) into salary_percentile from public.score_offer_catalog_v1 where annual_salary<=offer_row.annual_salary;
      offer_value:=220*(0.65*score_company_difficulty_v1(offer_row.thresholds)+0.35*salary_percentile);
      select 100*avg(least(1,greatest(0,(score_stat_v1(p_final_stats,key)-value::numeric+10)/20))) into job_match from jsonb_each_text(offer_row.thresholds);
      career:=offer_value+coalesce(job_match,0);
    end if;
  end if;

  thesis:=score_thesis_v1(score_stat_v1(p_final_stats,'thesisScore'));
  survival:=140*(0.20*score_stat_v1(p_final_stats,'stress')+0.18*score_stat_v1(p_final_stats,'health')+0.16*(100-score_stat_v1(p_final_stats,'selfDoubt'))+0.16*(100-score_stat_v1(p_final_stats,'ageAnxiety'))+0.12*score_stat_v1(p_final_stats,'mentorFavorability')+0.08*score_stat_v1(p_final_stats,'money')+0.05*score_stat_v1(p_final_stats,'reputation')+0.05*score_stat_v1(p_final_stats,'network'))/100;
  internship:=least(50,greatest(0,coalesce(p_internship_count,0))*13);
  completion:=20*least(24,greatest(1,p_turns))/24.0;
  experience:=internship+completion; -- 历史记录没有本局成就 ID，成就分保守按 0。
  raw_total:=career+ability+thesis+survival+experience;
  if p_is_early then multiplier:=round(0.5+0.5*least(24,greatest(1,p_turns))/24.0,2); end if;
  final_total:=round(least(1000,greatest(0,raw_total*multiplier)),2);
  return jsonb_build_object(
    'career',round(career,2),'ability',round(ability,2),'thesis',round(thesis,2),'survival',round(survival,2),'experience',round(experience,2),
    'offerValue',round(offer_value,2),'jobMatch',round(job_match,2),'finalAbility',round(final_ability,2),'growth',round(growth,2),
    'internship',round(internship,2),'achievement',0,'completion',round(completion,2),'earlyEndingMultiplier',round(multiplier,2),
    'rawTotal',round(raw_total,2),'finalTotal',final_total,'isEstimated',true,
    'estimatedAssumptions',jsonb_build_object('initialStats','学历层级生成基线','internshipPoints','每段13分，封顶50','achievementPoints',0,'earlyEndingTurns',case when p_is_early then p_turns else null end)
  );
end;
$$;

create or replace function public.backfill_legacy_game_results_v1()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  row_data record; reconstructed jsonb; score jsonb; matched_offer_id text; matched_offer_name text; matched_route_id text; inferred_ending_id text; inferred_turns integer; early boolean; updated_count integer:=0;
begin
  for row_data in select ctid,* from public.game_results where score_version is null and final_stats is not null loop
    reconstructed:=legacy_initial_stats_v1(row_data.character_tier,coalesce(row_data.is_overseas,false));
    matched_offer_id:=null; matched_offer_name:=null; matched_route_id:=null;
    select id,name,route_id into matched_offer_id,matched_offer_name,matched_route_id from public.score_offer_catalog_v1 where name=row_data.offer_name limit 1;
    early:=row_data.ending_title in ('被退学','不装了，摊牌了','被遗忘在时光深处','灰度空间的休止符');
    inferred_turns:=case when early then 12 else 24 end;
    inferred_ending_id:=case row_data.ending_title
      when '被退学' then 'expelled' when '不装了，摊牌了' then 'self_doubt_quit'
      when '被遗忘在时光深处' then 'age_anxiety_pivot' when '灰度空间的休止符' then 'stress_breakdown'
      else 'legacy_'||substr(md5(coalesce(row_data.ending_title,'unknown')),1,12) end;
    score:=estimate_legacy_score_v1(row_data.final_stats,reconstructed,matched_offer_id,row_data.internship_count,inferred_turns,early);
    update public.game_results set
      anonymous_id='legacy-'||substr(md5(row_data.ctid::text||random()::text),1,32),
      game_id='legacy-'||substr(md5(row_data.ctid::text||clock_timestamp()::text||random()::text),1,32),
      player_display_name='历史玩家',ending_id=inferred_ending_id,offer_id=matched_offer_id,offer_name=coalesce(matched_offer_name,row_data.offer_name),route_id=matched_route_id,
      initial_stats=reconstructed,turns_completed=inferred_turns,internship_ids='[]'::jsonb,achievement_ids='[]'::jsonb,
      score_total=(score->>'finalTotal')::numeric,score_breakdown=score,score_version=1,season_id='2026-S1',is_valid=true,is_estimated=true,invalid_reason=null
    where ctid=row_data.ctid;
    updated_count:=updated_count+1;
  end loop;
  return jsonb_build_object('updated',updated_count,'seasonId','2026-S1','scoreVersion',1,'isEstimated',true);
end;
$$;

create or replace function public.submit_game_result_v1(p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_variable
declare
  ability_keys text[] := array['arch','logic','expression','english','structured','dataSense','codeBasic','visualTaste','writingDepth','aestheticTheory','commercial','industryResearch','negotiation','leadership','empathy','execution','fastLearning','alignment'];
  final_stats jsonb := coalesce(p_result->'final_stats','{}'::jsonb);
  initial_stats jsonb := coalesce(p_result->'initial_stats','{}'::jsonb);
  turns integer := least(24, greatest(1, coalesce((p_result->>'turns_completed')::integer,1)));
  offer_row public.score_offer_catalog_v1%rowtype;
  final_avg numeric; final_top6 numeric; growth_avg numeric; growth_top6 numeric;
  final_ability numeric; growth numeric; ability numeric;
  offer_value numeric := 0; job_match numeric := 0; career numeric := 0;
  salary_percentile numeric := 0; threshold_match numeric := 0;
  thesis numeric; survival numeric; internship numeric := 0; achievement numeric := 0; completion numeric; experience numeric;
  raw_total numeric; multiplier numeric := 1; final_total numeric;
  valid boolean := true; reason text := null; submitted_score numeric;
  result_route text := null; result_offer_name text := null;
  total_players bigint := 0; player_rank bigint := 0; player_percentile numeric := 0;
  route_players bigint := 0; route_rank bigint := 0;
begin
  if coalesce(p_result->>'score_version','0')::integer <> 1 or coalesce(p_result->>'season_id','') <> '2026-S1' then
    raise exception 'unsupported score version or season';
  end if;
  if p_result->>'game_id' is null or p_result->>'anonymous_id' is null then raise exception 'missing identifiers'; end if;
  if (select count(*) from public.game_results where anonymous_id=p_result->>'anonymous_id' and submitted_at>now()-interval '1 minute' and game_id<>p_result->>'game_id') >= 5 then
    raise exception 'too many score submissions';
  end if;

  if exists (select 1 from jsonb_each_text(final_stats) where value !~ '^-?[0-9]+(?:\.[0-9]+)?$' or value::numeric < 0 or value::numeric > 100) then
    valid := false; reason := 'final_stats_out_of_range';
  end if;

  select avg(score_stat_v1(final_stats,k)), avg(score_stat_v1(initial_stats,k))
  into final_avg, growth_avg from unnest(ability_keys) k;
  select avg(v) into final_top6 from (select score_stat_v1(final_stats,k) v from unnest(ability_keys) k order by v desc limit 6) x;
  select avg(v) into growth_top6 from (select least(1,greatest(0,(score_stat_v1(final_stats,k)-score_stat_v1(initial_stats,k))/30)) v from unnest(ability_keys) k order by v desc limit 6) x;
  select avg(least(1,greatest(0,(score_stat_v1(final_stats,k)-score_stat_v1(initial_stats,k))/30))) into growth_avg from unnest(ability_keys) k;
  final_ability := 160*(0.65*final_top6/100+0.35*final_avg/100);
  growth := 100*(0.60*growth_top6+0.40*growth_avg);
  ability := final_ability+growth;

  if nullif(p_result->>'offer_id','') is not null then
    select * into offer_row from public.score_offer_catalog_v1 where id=p_result->>'offer_id';
    if not found then valid:=false; reason:=coalesce(reason,'unknown_offer');
    else
      result_route:=offer_row.route_id; result_offer_name:=offer_row.name;
      select count(*)::numeric/nullif((select count(*) from public.score_offer_catalog_v1),0) into salary_percentile from public.score_offer_catalog_v1 where annual_salary<=offer_row.annual_salary;
      offer_value:=220*(0.65*score_company_difficulty_v1(offer_row.thresholds)+0.35*salary_percentile);
      select avg(least(1,greatest(0,(score_stat_v1(final_stats,key)-value::numeric+10)/20))) into threshold_match from jsonb_each_text(offer_row.thresholds);
      job_match:=100*coalesce(threshold_match,0); career:=offer_value+job_match;
    end if;
  end if;

  thesis:=score_thesis_v1(score_stat_v1(final_stats,'thesisScore'));
  survival:=140*(0.20*score_stat_v1(final_stats,'stress')+0.18*score_stat_v1(final_stats,'health')+0.16*(100-score_stat_v1(final_stats,'selfDoubt'))+0.16*(100-score_stat_v1(final_stats,'ageAnxiety'))+0.12*score_stat_v1(final_stats,'mentorFavorability')+0.08*score_stat_v1(final_stats,'money')+0.05*score_stat_v1(final_stats,'reputation')+0.05*score_stat_v1(final_stats,'network'))/100;

  with requested as (select distinct value id from jsonb_array_elements_text(coalesce(p_result->'internship_ids','[]'::jsonb))), scored as (
    select case when score_company_difficulty_v1(o.thresholds)>=0.9 then 22 when score_company_difficulty_v1(o.thresholds)>=0.6 then 18 when score_company_difficulty_v1(o.thresholds)>=0.3 then 13 else 8 end points
    from requested r join public.score_internship_catalog_v1 i on i.id=r.id join public.score_offer_catalog_v1 o on o.id=i.company_id order by points desc limit 3)
  select least(50,coalesce(sum(points),0)) into internship from scored;
  if (select count(*) from jsonb_array_elements_text(coalesce(p_result->'internship_ids','[]'::jsonb))) <> (select count(*) from jsonb_array_elements_text(coalesce(p_result->'internship_ids','[]'::jsonb)) x join public.score_internship_catalog_v1 i on i.id=x.value) then valid:=false; reason:=coalesce(reason,'unknown_internship'); end if;

  select least(30,coalesce(sum(a.points),0)) into achievement from (select distinct value id from jsonb_array_elements_text(coalesce(p_result->'achievement_ids','[]'::jsonb))) x join public.score_achievement_catalog_v1 a on a.id=x.id;
  if (select count(*) from jsonb_array_elements_text(coalesce(p_result->'achievement_ids','[]'::jsonb))) <> (select count(*) from jsonb_array_elements_text(coalesce(p_result->'achievement_ids','[]'::jsonb)) x join public.score_achievement_catalog_v1 a on a.id=x.value) then valid:=false; reason:=coalesce(reason,'unknown_achievement'); end if;

  completion:=20*turns/24.0; experience:=internship+achievement+completion;
  raw_total:=career+ability+thesis+survival+experience;
  if (p_result->>'ending_id') in ('expelled','self_doubt_quit','age_anxiety_pivot','stress_breakdown') then multiplier:=round(0.5+0.5*turns/24.0,2); end if;
  final_total:=round(least(1000,greatest(0,raw_total*multiplier)),2);
  submitted_score:=nullif(p_result->>'client_score_total','')::numeric;
  if submitted_score is not null and abs(submitted_score-final_total)>0.1 then valid:=false; reason:=coalesce(reason,'client_score_mismatch'); end if;

  insert into public.game_results (anonymous_id,game_id,player_display_name,ending_id,ending_title,offer_id,offer_name,route_id,mentor_id,mentor_name,character_tier,undergrad_school,master_school,is_overseas,initial_stats,final_stats,turns_completed,internship_ids,achievement_ids,internship_count,score_total,score_breakdown,score_version,season_id,is_valid,invalid_reason)
  values (left(p_result->>'anonymous_id',64),left(p_result->>'game_id',64),left(coalesce(p_result->>'player_display_name','匿名建人'),40),p_result->>'ending_id',p_result->>'ending_title',p_result->>'offer_id',result_offer_name,result_route,p_result->>'mentor_id',p_result->>'mentor_name',p_result->>'character_tier',p_result->>'undergrad_school',p_result->>'master_school',coalesce((p_result->>'is_overseas')::boolean,false),initial_stats,final_stats,turns,coalesce(p_result->'internship_ids','[]'::jsonb),coalesce(p_result->'achievement_ids','[]'::jsonb),jsonb_array_length(coalesce(p_result->'internship_ids','[]'::jsonb)),final_total,
    jsonb_build_object('career',round(career,2),'ability',round(ability,2),'thesis',round(thesis,2),'survival',round(survival,2),'experience',round(experience,2),'offerValue',round(offer_value,2),'jobMatch',round(job_match,2),'finalAbility',round(final_ability,2),'growth',round(growth,2),'internship',round(internship,2),'achievement',round(achievement,2),'completion',round(completion,2),'earlyEndingMultiplier',round(multiplier,2),'rawTotal',round(raw_total,2),'finalTotal',final_total),1,'2026-S1',valid,reason)
  on conflict (game_id) do update set score_total=excluded.score_total,score_breakdown=excluded.score_breakdown,is_valid=excluded.is_valid,invalid_reason=excluded.invalid_reason,achievement_ids=excluded.achievement_ids;

  with best as (select *,row_number() over(partition by anonymous_id order by score_total desc,game_id) pick from public.game_results where season_id='2026-S1' and score_version=1 and is_valid), ranked as (select *,rank() over(order by score_total desc,(score_breakdown->>'career')::numeric desc,(final_stats->>'thesisScore')::numeric desc,(score_breakdown->>'growth')::numeric desc,(score_breakdown->>'survival')::numeric desc,game_id) rank_no,count(*) over() total from best where pick=1)
  select rank_no,total,case when total<=1 then 100 else round(100*(total-rank_no)::numeric/(total-1),1) end into player_rank,total_players,player_percentile from ranked where anonymous_id=p_result->>'anonymous_id';
  if result_route is not null then
    with best as (select *,row_number() over(partition by anonymous_id order by score_total desc,game_id) pick from public.game_results where season_id='2026-S1' and score_version=1 and is_valid and route_id=result_route), ranked as (select *,rank() over(order by score_total desc,game_id) rank_no,count(*) over() total from best where pick=1)
    select rank_no,total into route_rank,route_players from ranked where anonymous_id=p_result->>'anonymous_id';
  end if;
  return jsonb_build_object('accepted',valid,'score',final_total,'totalPlayers',total_players,'currentPlayer',jsonb_build_object('rank',player_rank,'totalPlayers',total_players,'percentile',player_percentile,'routeRank',nullif(route_rank,0),'routePlayers',nullif(route_players,0)));
end;
$$;

create or replace function public.get_leaderboard(p_season_id text default '2026-S1',p_score_version integer default 1,p_board_type text default 'overall',p_route_id text default null,p_mentor_id text default null,p_limit integer default 50,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path=public as $$
  with eligible as (
    select *,case when p_board_type='growth' then coalesce((score_breakdown->>'growth')::numeric,0) else score_total end board_score,
      row_number() over(partition by anonymous_id order by case when p_board_type='growth' then coalesce((score_breakdown->>'growth')::numeric,0) else score_total end desc,game_id) pick
    from public.game_results where season_id=p_season_id and score_version=p_score_version and is_valid and (p_route_id is null or route_id=p_route_id) and (p_mentor_id is null or mentor_id=p_mentor_id)
  ), ranked as (
    select *,rank() over(order by board_score desc,score_total desc,game_id) rank_no,count(*) over() total from eligible where pick=1
  )
  select jsonb_build_object('totalPlayers',coalesce(max(total),0),'rows',coalesce(jsonb_agg(jsonb_build_object('rank',rank_no,'displayName',case when length(player_display_name)<=1 then '建人***号' else left(player_display_name,1)||'***' end,'score',round(score_total),'boardScore',round(board_score,2),'endingTitle',ending_title,'offerName',offer_name,'mentorId',mentor_id,'routeId',route_id,'isEstimated',is_estimated) order by rank_no),'[]'::jsonb))
  from (select * from ranked order by rank_no limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)) page;
$$;

-- 幂等回填：只处理尚无 score_version 的历史记录；再次执行不会重复回填。
select public.backfill_legacy_game_results_v1();

revoke all on function public.submit_game_result_v1(jsonb) from public;
revoke all on function public.get_leaderboard(text,integer,text,text,text,integer,integer) from public;
revoke all on function public.backfill_legacy_game_results_v1() from public;
grant execute on function public.submit_game_result_v1(jsonb) to anon,authenticated;
grant execute on function public.get_leaderboard(text,integer,text,text,text,integer,integer) to anon,authenticated;
revoke all on public.score_offer_catalog_v1,public.score_internship_catalog_v1,public.score_achievement_catalog_v1 from anon,authenticated;
revoke insert,update on public.game_results from anon,authenticated;
grant insert (ending_title,offer_name,mentor_name,character_tier,undergrad_school,master_school,is_overseas,final_stats,internship_count) on public.game_results to anon,authenticated;
