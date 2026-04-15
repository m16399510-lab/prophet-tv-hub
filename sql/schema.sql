create extension if not exists pgcrypto;

create table if not exists ptv_admin_users (
    username text primary key,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table if not exists ptv_site_content (
    content_key text primary key,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists ptv_games (
    id text primary key,
    title text not null default '',
    sort_order integer not null default 0,
    is_visible boolean not null default true,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into ptv_site_content (content_key, payload)
values ('bulletin', '{}'::jsonb)
on conflict (content_key) do nothing;

insert into ptv_admin_users (username, password_hash)
values ('admin', crypt('prophet-tv', gen_salt('bf')))
on conflict (username) do nothing;

alter table ptv_site_content enable row level security;
alter table ptv_games enable row level security;

drop policy if exists "public can read bulletin" on ptv_site_content;
create policy "public can read bulletin"
on ptv_site_content
for select
using (true);

drop policy if exists "public can read visible games" on ptv_games;
create policy "public can read visible games"
on ptv_games
for select
using (is_visible = true);

create or replace function ptv_check_admin(p_username text, p_password text)
returns boolean
language sql
security definer
stable
as $$
    select exists (
        select 1
        from ptv_admin_users
        where username = p_username
          and password_hash = crypt(p_password, password_hash)
    );
$$;

create or replace function ptv_public_snapshot()
returns json
language plpgsql
security definer
as $$
begin
    return json_build_object(
        'success', true,
        'data', json_build_object(
            'bulletin', coalesce(
                (select payload from ptv_site_content where content_key = 'bulletin'),
                '{}'::jsonb
            ),
            'games', coalesce(
                (
                    select json_agg(payload order by sort_order asc, updated_at desc)
                    from ptv_games
                    where is_visible = true
                ),
                '[]'::json
            )
        )
    );
end;
$$;

create or replace function ptv_admin_login(p_username text, p_password text)
returns json
language plpgsql
security definer
as $$
begin
    if not ptv_check_admin(p_username, p_password) then
        return json_build_object('success', false, 'message', '用户名或密码错误');
    end if;

    return json_build_object('success', true, 'message', '登录成功');
end;
$$;

create or replace function ptv_admin_get_snapshot(p_username text, p_password text)
returns json
language plpgsql
security definer
as $$
begin
    if not ptv_check_admin(p_username, p_password) then
        return json_build_object('success', false, 'message', '管理员验证失败');
    end if;

    return json_build_object(
        'success', true,
        'data', json_build_object(
            'bulletin', coalesce(
                (select payload from ptv_site_content where content_key = 'bulletin'),
                '{}'::jsonb
            ),
            'games', coalesce(
                (
                    select json_agg(payload order by sort_order asc, updated_at desc)
                    from ptv_games
                ),
                '[]'::json
            )
        )
    );
end;
$$;

create or replace function ptv_admin_update_bulletin(
    p_username text,
    p_password text,
    p_payload jsonb
)
returns json
language plpgsql
security definer
as $$
begin
    if not ptv_check_admin(p_username, p_password) then
        return json_build_object('success', false, 'message', '管理员验证失败');
    end if;

    insert into ptv_site_content (content_key, payload, updated_at)
    values ('bulletin', coalesce(p_payload, '{}'::jsonb), now())
    on conflict (content_key)
    do update set
        payload = excluded.payload,
        updated_at = now();

    return json_build_object('success', true, 'message', '公告已保存');
end;
$$;

create or replace function ptv_admin_upsert_game(
    p_username text,
    p_password text,
    p_payload jsonb
)
returns json
language plpgsql
security definer
as $$
declare
    v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
    v_id text := coalesce(nullif(v_payload ->> 'id', ''), gen_random_uuid()::text);
    v_title text := coalesce(nullif(v_payload ->> 'title', ''), '未命名作品');
    v_sort_order integer := coalesce(nullif(v_payload ->> 'sortOrder', '')::integer, 0);
    v_is_visible boolean := case coalesce(v_payload ->> 'visible', 'true')
        when 'false' then false
        else true
    end;
begin
    if not ptv_check_admin(p_username, p_password) then
        return json_build_object('success', false, 'message', '管理员验证失败');
    end if;

    v_payload := jsonb_set(v_payload, '{id}', to_jsonb(v_id), true);
    v_payload := jsonb_set(
        v_payload,
        '{updatedAt}',
        to_jsonb(to_char(now() at time zone 'Asia/Shanghai', 'YYYY-MM-DD')),
        true
    );

    insert into ptv_games (id, title, sort_order, is_visible, payload, updated_at)
    values (v_id, v_title, v_sort_order, v_is_visible, v_payload, now())
    on conflict (id)
    do update set
        title = excluded.title,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        payload = excluded.payload,
        updated_at = now();

    return json_build_object('success', true, 'message', '作品已保存', 'id', v_id);
end;
$$;

create or replace function ptv_admin_delete_game(
    p_username text,
    p_password text,
    p_game_id text
)
returns json
language plpgsql
security definer
as $$
begin
    if not ptv_check_admin(p_username, p_password) then
        return json_build_object('success', false, 'message', '管理员验证失败');
    end if;

    delete from ptv_games
    where id = p_game_id;

    if not found then
        return json_build_object('success', false, 'message', '没有找到对应作品');
    end if;

    return json_build_object('success', true, 'message', '作品已删除');
end;
$$;
