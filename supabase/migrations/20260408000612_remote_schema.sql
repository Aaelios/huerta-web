


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."entitlement_event_type" AS ENUM (
    'grant',
    'renew',
    'revoke',
    'expire',
    'restore'
);


ALTER TYPE "public"."entitlement_event_type" OWNER TO "postgres";


CREATE TYPE "public"."entitlement_source_type" AS ENUM (
    'order',
    'subscription',
    'manual',
    'promo',
    'migration'
);


ALTER TYPE "public"."entitlement_source_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_audit_updated_at_only_update_v1"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;


ALTER FUNCTION "app"."f_audit_updated_at_only_update_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contact_normalize_v1"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v jsonb := coalesce(p_input, '{}'::jsonb);
  email text; type_ text; source_raw text; source_ text;
begin
  email      := lower(trim(coalesce(v->>'email','')));
  type_      := lower(trim(coalesce(v->>'type','')));
  source_raw := lower(trim(coalesce(v->>'source','')));

  source_ := case
               when source_raw in ('web_form_contact','web_form_footer') then 'web_form'
               when source_raw in ('web_form','checkout','import','api') then source_raw
               else source_raw
             end;

  v := jsonb_set(v, '{email}',  to_jsonb(email::text),  true);
  v := jsonb_set(v, '{type}',   to_jsonb(type_::text),  true);
  v := jsonb_set(v, '{source}', to_jsonb(source_::text),true);

  return v;
end;
$$;


ALTER FUNCTION "app"."f_contact_normalize_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contact_validate_v1"("p_input" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $_$
declare
  v_email text := lower(trim(coalesce(p_input->>'email','')));
  v_type text := lower(trim(coalesce(p_input->>'type','')));
  v_source text := lower(trim(coalesce(p_input->>'source','')));
  v_request_id text := trim(coalesce(p_input->>'request_id',''));

  allowed_types text[] := array['newsletter','contact_form','support','complaint','suggestion','checkout'];
  allowed_sources text[] := array['web_form','checkout','import','api'];
  allowed_motivos text[] := array['pago','acceso','mejora','consulta','soporte'];

  max_json_bytes constant int := 65536;
  j_utm jsonb := p_input->'utm';
  j_tech jsonb := p_input->'tech_metrics';
  j_context jsonb := p_input->'context';
  j_payload jsonb := p_input->'payload';
  j_metadata jsonb := p_input->'metadata';

  v_motivo text := lower(trim(coalesce(j_metadata->>'motivo','')));
  v_telefono text := trim(coalesce(j_metadata->>'telefono',''));
begin
  -- campos base
  if v_email = '' then raise exception 'invalid_input: email requerido' using errcode='22023'; end if;
  if v_type = '' then raise exception 'invalid_input: type requerido' using errcode='22023'; end if;
  if v_source = '' then raise exception 'invalid_input: source requerido' using errcode='22023'; end if;
  if v_request_id = '' then raise exception 'invalid_input: request_id requerido' using errcode='22023'; end if;

  if v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_input: email inválido' using errcode='22023';
  end if;
  if not app.f_is_uuid_v4_v1(v_request_id) then
    raise exception 'invalid_input: request_id no es UUID v4' using errcode='22023';
  end if;

  if not (v_type = any(allowed_types)) then
    raise exception 'invalid_input: type no permitido (%)', v_type using errcode='22023';
  end if;
  if not (v_source = any(allowed_sources)) then
    raise exception 'invalid_input: source no permitido (%)', v_source using errcode='22023';
  end if;

  -- tamaños json
  if j_utm      is not null and app.f_sizeof_json_v1(j_utm)      > max_json_bytes then raise exception 'invalid_input: utm excede % bytes', max_json_bytes using errcode='22023'; end if;
  if j_tech     is not null and app.f_sizeof_json_v1(j_tech)     > max_json_bytes then raise exception 'invalid_input: tech_metrics excede % bytes', max_json_bytes using errcode='22023'; end if;
  if j_context  is not null and app.f_sizeof_json_v1(j_context)  > max_json_bytes then raise exception 'invalid_input: context excede % bytes', max_json_bytes using errcode='22023'; end if;
  if j_payload  is not null and app.f_sizeof_json_v1(j_payload)  > max_json_bytes then raise exception 'invalid_input: payload excede % bytes', max_json_bytes using errcode='22023'; end if;
  if j_metadata is not null and app.f_sizeof_json_v1(j_metadata) > max_json_bytes then raise exception 'invalid_input: metadata excede % bytes', max_json_bytes using errcode='22023'; end if;

  -- reglas tipo contact_form / support
  if v_type = 'contact_form' then
    if coalesce(nullif(trim(coalesce(p_input#>>'{payload,message}','')),''),'') = '' then
      raise exception 'invalid_input: payload.message requerido para contact_form' using errcode='22023';
    end if;
  elsif v_type = 'support' then
    if coalesce(nullif(trim(coalesce(p_input#>>'{payload,message}','')),''),'') = '' and
       coalesce(nullif(trim(coalesce(p_input#>>'{payload,topic}','')),''),'') = '' then
      raise exception 'invalid_input: payload.topic o payload.message requerido para support' using errcode='22023';
    end if;
  end if;

  -- validaciones metadata
  if v_motivo <> '' and not (v_motivo = any(allowed_motivos)) then
    raise exception 'invalid_input: metadata.motivo no permitido (%)', v_motivo using errcode='22023';
  end if;

  if v_telefono <> '' and v_telefono !~ '^[0-9+ \-]{7,20}$' then
    raise exception 'invalid_input: metadata.telefono inválido' using errcode='22023';
  end if;
end;
$_$;


ALTER FUNCTION "app"."f_contact_validate_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contacts_apply_consent_v1"("p_contact_id" "uuid", "p" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v_opt_in boolean := case when (p ? 'marketing_opt_in') then (p->>'marketing_opt_in')::boolean else null end;
  v_opt_in_at timestamptz := (p->>'marketing_opt_in_at')::timestamptz;
  v_source_raw text := lower(trim(coalesce(p->>'consent_source', p->>'source', null)));
  v_source text;
begin
  if p_contact_id is null then
    raise exception 'db_error: contact_id nulo en f_contacts_apply_consent_v1';
  end if;

  -- Mapeo a catálogo reducido:
  -- web_form_contact|web_form_footer -> 'web_form'
  -- checkout|import|api -> se mantienen
  -- cualquier otro -> NULL (no se escribe)
  v_source := case
                when v_source_raw in ('web_form_contact','web_form_footer') then 'web_form'
                when v_source_raw in ('checkout','import','api') then v_source_raw
                else null
              end;

  if v_opt_in is true then
    update public.contacts
       set consent_status = case
                              when coalesce(consent_status,'none') in ('none','unsubscribed') then 'single_opt_in'
                              else consent_status
                            end,
           consent_at     = coalesce(consent_at, coalesce(v_opt_in_at, now())),
           consent_source = coalesce(v_source, consent_source),
           updated_at     = now()
     where id = p_contact_id;
  end if;
end;
$$;


ALTER FUNCTION "app"."f_contacts_apply_consent_v1"("p_contact_id" "uuid", "p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contacts_free_class_upsert_v1"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
/*
  f_contacts_free_class_upsert_v1

  Propósito:
    - Upsert de un registro de free class dentro de contacts.metadata.free_class_registrations.
    - Idempotente por combinación (class_sku, instance_slug).
    - No modifica ninguna otra clave de contacts.metadata.

  Contrato:
    - Debe existir un contacto con id = p_contact_id.
    - Solo acepta p_status en ('registered','waitlist','closed').
    - p_class_sku y p_instance_slug deben ser strings no vacíos.
    - p_ts se almacena como string ISO-8601 en el campo "ts".

  Seguridad:
    - SECURITY DEFINER: ejecuta con el rol dueño de la función.
    - RLS sigue activo en public.contacts, pero el owner debe tener permisos suficientes.
*/
DECLARE
  l_metadata        jsonb;
  l_registrations   jsonb;
  l_existing        jsonb;
  l_new_entry       jsonb;
  l_ts_iso          text;
  l_found           boolean := false;
  l_idx             integer;
  l_len             integer;
BEGIN
  -- Validaciones básicas de entrada
  IF p_contact_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: contact_id requerido en f_contacts_free_class_upsert_v1';
  END IF;

  IF COALESCE(btrim(p_class_sku), '') = '' THEN
    RAISE EXCEPTION 'invalid_input: class_sku requerido en f_contacts_free_class_upsert_v1';
  END IF;

  IF COALESCE(btrim(p_instance_slug), '') = '' THEN
    RAISE EXCEPTION 'invalid_input: instance_slug requerido en f_contacts_free_class_upsert_v1';
  END IF;

  IF p_status NOT IN ('registered', 'waitlist', 'closed') THEN
    RAISE EXCEPTION 'invalid_input: status inválido "%" en f_contacts_free_class_upsert_v1', p_status;
  END IF;

  -- Normalizar ts a string ISO-8601 (UTC)
  l_ts_iso := to_char(
    (p_ts AT TIME ZONE 'UTC'),
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  -- Leer metadata actual del contacto con bloqueo de fila
  SELECT metadata
    INTO l_metadata
  FROM public.contacts
  WHERE id = p_contact_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contact_not_found: no existe contacto con id=% en f_contacts_free_class_upsert_v1', p_contact_id;
  END IF;

  -- Normalizar metadata a objeto JSON
  l_metadata := COALESCE(l_metadata, '{}'::jsonb);

  -- Extraer y normalizar free_class_registrations a array
  l_registrations := l_metadata->'free_class_registrations';

  IF l_registrations IS NULL
     OR jsonb_typeof(l_registrations) IS DISTINCT FROM 'array'
  THEN
    -- Si no existe o está corrupto para este uso, se sanea a array vacío
    l_registrations := '[]'::jsonb;
  END IF;

  -- Construir la entrada base con los campos estándar
  l_new_entry := jsonb_build_object(
    'class_sku',     p_class_sku,
    'instance_slug', p_instance_slug,
    'status',        p_status,
    'ts',            to_jsonb(l_ts_iso)
  );

  -- Upsert por (class_sku, instance_slug)
  l_len := jsonb_array_length(l_registrations);
  l_idx := 0;

  WHILE l_idx < l_len LOOP
    l_existing := l_registrations->l_idx;

    IF l_existing->>'class_sku' = p_class_sku
       AND l_existing->>'instance_slug' = p_instance_slug
    THEN
      -- Preservar claves extra + sobrescribir las estándar
      l_existing := l_existing || l_new_entry;

      l_registrations := jsonb_set(
        l_registrations,
        ARRAY[l_idx::text],  -- <-- cambio importante: path como text[]
        l_existing,
        false
      );

      l_found := true;
      EXIT;
    END IF;

    l_idx := l_idx + 1;
  END LOOP;

  -- Si no se encontró, anexar nueva entrada
  IF NOT l_found THEN
    l_registrations := l_registrations || jsonb_build_array(l_new_entry);
  END IF;

  -- Reescribir solo la clave free_class_registrations en metadata
  l_metadata := l_metadata || jsonb_build_object(
    'free_class_registrations', l_registrations
  );

  -- Persistir cambios en contacts
  UPDATE public.contacts
     SET metadata   = l_metadata,
         updated_at = now()
   WHERE id = p_contact_id;

  RETURN;
END;
$$;


ALTER FUNCTION "app"."f_contacts_free_class_upsert_v1"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contacts_marketing_update_v1"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
DECLARE
  v_in              jsonb := COALESCE(p_input, '{}'::jsonb);

  v_contact_id      uuid := NULLIF(v_in->>'contact_id', '')::uuid;
  v_tags_in         jsonb := v_in->'tags';
  v_ok              boolean := COALESCE((v_in->>'ok')::boolean, false);
  v_brevo_id_input  text := NULLIF(TRIM(COALESCE(v_in->>'brevo_contact_id', '')), '');
  v_error_code      text := NULLIF(TRIM(COALESCE(v_in->>'error_code', '')), '');

  v_last_status     text;
  v_now             timestamptz := now();

  l_metadata        jsonb;
  l_marketing       jsonb;
  l_brevo           jsonb;
  l_existing_tags   jsonb;
  l_final_tags      jsonb := '[]'::jsonb;
  l_existing_brevo_id text;
BEGIN
  -- Validaciones básicas
  IF v_contact_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input: contact_id requerido en f_contacts_marketing_update_v1';
  END IF;

  -- Resolver last_status
  IF v_ok THEN
    v_last_status := 'synced_ok';
  ELSE
    v_last_status := 'sync_error';
  END IF;

  -- Bloquear fila de contacto y obtener metadata + brevo_contact_id actual
  SELECT metadata, brevo_contact_id
    INTO l_metadata, l_existing_brevo_id
  FROM public.contacts
  WHERE id = v_contact_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contact_not_found: no existe contacto con id=% en f_contacts_marketing_update_v1', v_contact_id;
  END IF;

  l_metadata := COALESCE(l_metadata, '{}'::jsonb);

  -- marketing object
  l_marketing := l_metadata->'marketing';
  IF l_marketing IS NULL OR jsonb_typeof(l_marketing) IS DISTINCT FROM 'object' THEN
    l_marketing := '{}'::jsonb;
  END IF;

  -- tags existentes
  l_existing_tags := l_marketing->'tags';
  IF l_existing_tags IS NULL OR jsonb_typeof(l_existing_tags) IS DISTINCT FROM 'array' THEN
    l_existing_tags := '[]'::jsonb;
  END IF;

  -- calcular tags finales (unión) si se recibieron tags nuevos
  IF v_tags_in IS NOT NULL AND jsonb_typeof(v_tags_in) = 'array' THEN
    SELECT COALESCE(jsonb_agg(DISTINCT t.tag), '[]'::jsonb)
      INTO l_final_tags
    FROM (
      SELECT jsonb_array_elements_text(l_existing_tags) AS tag
      UNION
      SELECT jsonb_array_elements_text(v_tags_in) AS tag
    ) AS t;
  ELSE
    l_final_tags := l_existing_tags;
  END IF;

  -- brevo object
  l_brevo := l_marketing->'brevo';
  IF l_brevo IS NULL OR jsonb_typeof(l_brevo) IS DISTINCT FROM 'object' THEN
    l_brevo := '{}'::jsonb;
  END IF;

  l_brevo := l_brevo
    || jsonb_build_object(
         'last_status',     v_last_status,
         'last_sync_at',    to_jsonb(v_now),
         'last_error_code', CASE WHEN v_error_code IS NULL THEN NULL ELSE to_jsonb(v_error_code) END
       );

  -- reconstruir marketing
  l_marketing :=
    l_marketing
    || jsonb_build_object('tags', l_final_tags)
    || jsonb_build_object('brevo', l_brevo);

  -- reconstruir metadata completa
  l_metadata :=
    l_metadata
    || jsonb_build_object('marketing', l_marketing);

  -- decidir brevo_contact_id final
  IF v_brevo_id_input IS NOT NULL THEN
    l_existing_brevo_id := v_brevo_id_input;
  END IF;

  -- actualizar contacto
  UPDATE public.contacts c
     SET metadata        = l_metadata,
         brevo_contact_id = l_existing_brevo_id,
         updated_at      = v_now,
         status          = CASE
                             WHEN v_error_code = 'invalid_email' THEN 'bounced'
                             ELSE c.status
                           END
   WHERE c.id = v_contact_id;

  RETURN jsonb_build_object(
    'contact_id',       v_contact_id,
    'brevo_contact_id', l_existing_brevo_id,
    'last_status',      v_last_status,
    'last_error_code',  v_error_code,
    'tags',             l_final_tags
  );
END;
$$;


ALTER FUNCTION "app"."f_contacts_marketing_update_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_contacts_upsert_v1"("p" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v_email citext := lower(trim(coalesce(p->>'email','')))::citext;
  v_full_name text := nullif(trim(coalesce(p->>'full_name', p->>'name', '')), '');
  v_id uuid;
  v_utm jsonb        := p->'utm';
  v_tech jsonb       := p->'tech_metrics';
  v_metadata jsonb   := p->'metadata';
  v_source text      := lower(trim(coalesce(p->>'source','')));
begin
  if v_email is null or v_email = ''::citext then
    raise exception 'invalid_input: email requerido en f_contacts_upsert_v1';
  end if;

  select id into v_id
  from public.contacts
  where email = v_email
  for update;

  if not found then
    insert into public.contacts (
      email, full_name, status, consent_status, consent_source,
      utm, tech_metrics, metadata, created_at, updated_at
    ) values (
      v_email, v_full_name, 'active', 'none', null,
      coalesce(v_utm, '{}'::jsonb),
      coalesce(v_tech, '{}'::jsonb),
      coalesce(v_metadata, '{}'::jsonb),
      now(), now()
    )
    returning id into v_id;
  else
    update public.contacts c
       set full_name    = coalesce(c.full_name, v_full_name),
           utm          = app.f_json_merge_shallow_v1(c.utm,        v_utm),
           tech_metrics = app.f_json_merge_shallow_v1(c.tech_metrics,v_tech),
           metadata     = app.f_json_merge_shallow_v1(c.metadata,   v_metadata),
           updated_at   = now()
     where c.id = v_id;
  end if;

  perform app.f_contacts_apply_consent_v1(v_id, p);

  update public.contacts
     set consent_source = coalesce(nullif(consent_source,''), nullif(v_source,''))
   where id = v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "app"."f_contacts_upsert_v1"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_event_idempotency_key_v1"("p_email" "public"."citext", "p_campaign_id" "text", "p_event_type" "text", "p_request_id" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
  select lower(coalesce(p_email::text,'')) || ':' ||
         coalesce(nullif(p_campaign_id,''), coalesce(p_request_id::text,'')) || ':' ||
         lower(coalesce(p_event_type,''))
$$;


ALTER FUNCTION "app"."f_event_idempotency_key_v1"("p_email" "public"."citext", "p_campaign_id" "text", "p_event_type" "text", "p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_input_redact_v1"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  keys_sensitive constant text[] := array[
    'turnstile_token','authorization','cookie','cookies',
    'password','secret','api_key','token','access_token','refresh_token'
  ];
  k text;
  result jsonb := coalesce(p_input, '{}'::jsonb);
  hdr jsonb;
  hdr_key text;
  new_headers jsonb := '{}'::jsonb;
begin
  -- Remover en raíz
  foreach k in array keys_sensitive loop
    if result ? k then
      result := result - k;
    end if;
  end loop;

  -- Filtrar dentro de headers si existe
  if (result ? 'headers') and jsonb_typeof(result->'headers') = 'object' then
    hdr := result->'headers';
    for hdr_key in select key from jsonb_object_keys(hdr) as t(key)
    loop
      if not (hdr_key = any(keys_sensitive)) then
        new_headers := new_headers || jsonb_build_object(hdr_key, hdr->hdr_key);
      end if;
    end loop;
    result := jsonb_set(result, '{headers}', new_headers, true);
  end if;

  return result;
end;
$$;


ALTER FUNCTION "app"."f_input_redact_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_is_uuid_v4_v1"("p" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $_$
  select p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
$_$;


ALTER FUNCTION "app"."f_is_uuid_v4_v1"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_json_merge_shallow_v1"("base" "jsonb", "patch" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  k text;
  filtered_patch jsonb := '{}'::jsonb;
begin
  if patch is null or patch = 'null'::jsonb then
    return coalesce(base, '{}'::jsonb);
  end if;

  if base is null or base = 'null'::jsonb then
    return coalesce(patch, '{}'::jsonb);
  end if;

  -- Construir patch filtrado: solo claves que NO existen en base
  for k in select key from jsonb_object_keys(patch) as t(key)
  loop
    if not (base ? k) then
      filtered_patch := filtered_patch || jsonb_build_object(k, patch->k);
    end if;
  end loop;

  return base || filtered_patch;
end;
$$;


ALTER FUNCTION "app"."f_json_merge_shallow_v1"("base" "jsonb", "patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_messages_idempotent_v1"("p_contact_id" "uuid", "p" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v_request_id text := p->>'request_id';
  v_source text     := lower(coalesce(p->>'source','web_form'));
  v_payload jsonb   := coalesce(p->'payload','{}'::jsonb);
  v_utm jsonb       := coalesce(p->'utm','{}'::jsonb);
  v_context jsonb   := coalesce(p->'context','{}'::jsonb);
  v_meta_in jsonb   := coalesce(p->'metadata','{}'::jsonb);

  v_input_redacted jsonb := app.f_input_redact_v1(p);
  v_original_hash  text  := app.f_sha256_json_v1(p);
  v_size_bytes     int   := app.f_sizeof_json_v1(p);

  v_metadata jsonb;
  v_id uuid;
begin
  if p_contact_id is null then
    raise exception 'invalid_input: contact_id requerido en f_messages_idempotent_v1';
  end if;
  if v_request_id is null or v_request_id = '' then
    raise exception 'invalid_input: request_id requerido en f_messages_idempotent_v1';
  end if;

  -- Dedupe por (contact_id, metadata->>request_id)
  select id into v_id
  from public.messages
  where contact_id = p_contact_id
    and metadata->>'request_id' = v_request_id
  for update;

  if found then
    return v_id;
  end if;

  -- Metadata final con auditoría
  v_metadata :=
    jsonb_build_object(
      'request_id',     v_request_id,
      'original_hash',  v_original_hash,
      'size_bytes',     v_size_bytes,
      'original_input', v_input_redacted
    ) || v_meta_in;

  -- Insert alineado a columnas reales
  insert into public.messages(
    contact_id, source, payload, utm, context, processing_status, metadata, created_at, updated_at
  ) values (
    p_contact_id, v_source, v_payload, v_utm, v_context, 'received', v_metadata, now(), now()
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "app"."f_messages_idempotent_v1"("p_contact_id" "uuid", "p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_orch_contact_write_v2"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
DECLARE
  v_in                jsonb := COALESCE(p_input, '{}'::jsonb);

  v_contact_core      jsonb := COALESCE(v_in->'contact_core', '{}'::jsonb);
  v_free_class        jsonb := v_in->'free_class';

  v_email_raw         text := COALESCE(v_contact_core->>'email', '');
  v_email_norm        text;
  v_contact_core_norm jsonb;

  v_contact_id        uuid;
  v_brevo_id          text;
  v_status            text := 'ok';

  v_free_class_processed boolean := false;

  v_consent_status    text;
  v_consent_source    text;
  v_consent_at        timestamptz;
BEGIN
  -- 1) Normalizar email
  v_email_norm := lower(trim(v_email_raw));

  IF v_email_norm IS NULL OR v_email_norm = '' THEN
    RAISE EXCEPTION 'invalid_input: contact_core.email requerido en f_orch_contact_write_v2';
  END IF;

  -- 2) Reconstruir contact_core con email normalizado
  v_contact_core_norm :=
    jsonb_build_object('email', v_email_norm)
    || (v_contact_core - 'email');

  -- 3) Upsert contacto
  v_contact_id := app.f_contacts_upsert_v1(v_contact_core_norm);

  -- 3.b) Consentimiento (solo si aún era "none")
  v_consent_status := nullif(trim(COALESCE(v_contact_core_norm->>'consent_status', '')), '');
  v_consent_source := nullif(trim(COALESCE(v_contact_core_norm->>'consent_source', '')), '');

  IF v_contact_core_norm ? 'consent_at' THEN
    v_consent_at := (v_contact_core_norm->>'consent_at')::timestamptz;
  ELSE
    v_consent_at := NULL;
  END IF;

  IF v_consent_status IS NOT NULL THEN
    UPDATE public.contacts c
    SET
      consent_status = v_consent_status,
      consent_source = COALESCE(v_consent_source, c.consent_source),
      consent_at     = COALESCE(v_consent_at,     c.consent_at)
    WHERE
      c.id = v_contact_id
      AND (c.consent_status IS NULL OR c.consent_status = 'none');
  END IF;

  -- 4) Free class (opcional)
  IF v_free_class IS NOT NULL THEN
    PERFORM app.f_contacts_free_class_upsert_v1(
      v_contact_id,
      COALESCE(trim(v_free_class->>'class_sku'), ''),
      COALESCE(trim(v_free_class->>'instance_slug'), ''),
      COALESCE(trim(v_free_class->>'status'), 'registered'),
      COALESCE(
        (v_free_class->>'ts')::timestamptz,
        now()::timestamptz
      )
    );
    v_free_class_processed := true;
  END IF;

  -- 5) Obtener brevo_contact_id actual
  SELECT brevo_contact_id
    INTO v_brevo_id
  FROM public.contacts
  WHERE id = v_contact_id;

  -- 6) Respuesta estándar
  RETURN jsonb_build_object(
    'version','v2',
    'status', v_status,
    'contact', jsonb_build_object(
      'id',               v_contact_id,
      'email',            v_email_norm,
      'brevo_contact_id', v_brevo_id
    ),
    'free_class', CASE
      WHEN v_free_class IS NULL THEN NULL::jsonb
      ELSE jsonb_build_object(
        'processed', v_free_class_processed
      )
    END
  );
END;
$$;


ALTER FUNCTION "app"."f_orch_contact_write_v2"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_sha256_json_v1"("p" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
  -- md5(text) retorna hex de 32 chars; suficiente para claves de dedupe
  select md5(coalesce(p, '{}'::jsonb)::text)
$$;


ALTER FUNCTION "app"."f_sha256_json_v1"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_sizeof_json_v1"("p" "jsonb") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
  select coalesce(pg_column_size(p), 0)
$$;


ALTER FUNCTION "app"."f_sizeof_json_v1"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."f_subscription_events_log_v1"("p_contact_id" "uuid", "p" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v_email citext;
  v_event_type text := lower(trim(coalesce(p->>'event_type','')));
  v_source_raw text := lower(trim(coalesce(p->>'source','')));
  v_source text;
  v_reason text := nullif(trim(coalesce(p->>'reason','')), '');
  v_campaign_id text := nullif(trim(coalesce(p->>'campaign_id','')), '');
  v_request_id uuid := nullif(p->>'request_id','')::uuid;
  v_meta jsonb := coalesce(p->'metadata','{}'::jsonb);
  v_occurred_at timestamptz := coalesce((p->>'occurred_at')::timestamptz, now());
  v_idem text;
  v_id uuid;
begin
  if p_contact_id is null then
    raise exception 'invalid_input: contact_id requerido';
  end if;

  select email into v_email
  from public.contacts
  where id = p_contact_id;

  if v_email is null then
    raise exception 'invalid_input: contact_id inexistente';
  end if;

  -- normalizar source al catálogo de la tabla
  v_source := case
                when v_source_raw in ('web_form','checkout','import','api','provider_webhook') then v_source_raw
                when v_source_raw in ('web_form_contact','web_form_footer') then 'web_form'
                else 'api'
              end;

  -- validar event_type permitido
  if v_event_type not in ('opt_in','double_opt_in','unsubscribe','bounce','complaint') then
    raise exception 'invalid_input: event_type no permitido (%)', v_event_type;
  end if;

  -- clave de idempotencia
  v_idem := app.f_event_idempotency_key_v1(v_email, v_campaign_id, v_event_type, v_request_id);

  -- dedupe por idempotency_key
  select id into v_id
  from public.subscription_events
  where idempotency_key = v_idem
  for update;

  if found then
    return v_id;
  end if;

  -- insert append-only
  insert into public.subscription_events(
    contact_id, event_type, source, reason, campaign_id,
    idempotency_key, metadata, occurred_at, created_at
  ) values (
    p_contact_id, v_event_type, v_source, v_reason, v_campaign_id,
    v_idem, v_meta, v_occurred_at, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "app"."f_subscription_events_log_v1"("p_contact_id" "uuid", "p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select auth.uid()
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_audit_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin new.updated_at := now(); return new; end; $$;


ALTER FUNCTION "public"."f_audit_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_audit_updated_at_only_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."f_audit_updated_at_only_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_auth_get_user"("p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validación básica
  IF coalesce(trim(p_email), '') = '' THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;

  -- Normalizar email
  p_email := lower(p_email);

  -- Buscar en auth.users
  SELECT u.id
    INTO v_user_id
  FROM auth.users u
  WHERE u.email = p_email
  LIMIT 1;

  -- Si no existe, devolver NULL (sin excepción)
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."f_auth_get_user"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_block_update_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  raise exception 'Append-only table: % not allowed on %', tg_op, tg_table_name;
end;
$$;


ALTER FUNCTION "public"."f_block_update_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select coalesce(
  f_bundle_schedule(f_bundle_children_next_start.bundle_sku)->'children',
  '[]'::jsonb
);
$$;


ALTER FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") IS 'Wrapper over f_bundle_schedule: returns only the children array [{"child_sku","next_start_at"}].';



CREATE OR REPLACE FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select jsonb_build_object(
  'bundle_sku', f_bundle_next_start_at.bundle_sku,
  'next_start_at', f_bundle_schedule(f_bundle_next_start_at.bundle_sku)->'next_start_at'
);
$$;


ALTER FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") IS 'Wrapper over f_bundle_schedule: returns {"bundle_sku","next_start_at"} only.';



CREATE OR REPLACE FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
with
  children as (
    select bi.child_sku
    from public.bundle_items bi
    where bi.bundle_sku = f_bundle_schedule.bundle_sku
  ),
  nexts as (
    select
      c.child_sku,
      min(lci.start_at) filter (
        where lci.status in ('scheduled','open')
          and lci.start_at > now()
      ) as next_start_at
    from children c
    left join public.live_class_instances lci
      on lci.sku = c.child_sku
    group by c.child_sku
  ),
  agg as (
    select min(n.next_start_at) as next_start_at
    from nexts n
    where n.next_start_at is not null
  ),
  children_json as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'child_sku', n.child_sku,
            'next_start_at', to_jsonb(n.next_start_at)
          )
          order by n.child_sku
        ),
        '[]'::jsonb
      ) as data
    from nexts n
  )
select jsonb_build_object(
  'bundle_sku', f_bundle_schedule.bundle_sku,
  'next_start_at', to_jsonb(a.next_start_at),
  'children', c.data
)
from agg a, children_json c;
$$;


ALTER FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") IS 'Returns {"bundle_sku","next_start_at","children":[{"child_sku","next_start_at"}]}. next_start_at = min future start among live_class children (status scheduled|open; start_at>now()). Non-live_class children return next_start_at=null.';



CREATE OR REPLACE FUNCTION "public"."f_bundles_expand_items"("p_bundle_sku" "text") RETURNS TABLE("sku" "text", "fulfillment_type" "text")
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_ft    text;
  v_count int;
begin
  if coalesce(trim(p_bundle_sku), '') = '' then
    raise exception 'INVALID_BUNDLE_SKU';
  end if;

  -- Verifica que el SKU exista y sea bundle
  select lower(p.fulfillment_type)
    into v_ft
  from public.products p
  where p.sku = p_bundle_sku;

  if v_ft is null then
    raise exception 'BUNDLE_NOT_FOUND';
  end if;

  if v_ft <> 'bundle' then
    raise exception 'NOT_A_BUNDLE';
  end if;

  -- Debe tener hijos
  select count(*) into v_count
  from public.bundle_items bi
  where bi.bundle_sku = p_bundle_sku;

  if v_count = 0 then
    raise exception 'BUNDLE_EMPTY';
  end if;

  -- Retorna hijos válidos (no soporta bundles anidados)
  return query
  select p.sku, lower(p.fulfillment_type) as fulfillment_type
  from public.bundle_items bi
  join public.products p on p.sku = bi.child_sku
  where bi.bundle_sku = p_bundle_sku
    and lower(p.status) in ('active','sunsetting')
    and lower(p.fulfillment_type) in ('course','template','live_class','one_to_one','subscription_grant');
end;
$$;


ALTER FUNCTION "public"."f_bundles_expand_items"("p_bundle_sku" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_catalog_price_by_sku"("p_sku" "text", "p_currency" "text" DEFAULT NULL::"text") RETURNS TABLE("stripe_price_id" "text", "amount_cents" integer, "currency" "text", "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER PARALLEL SAFE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  has_any_sku   boolean;
  has_curr_sku  boolean;
  best_level    text;
  r1 RECORD;
  r2 RECORD;
BEGIN
  -- 0) Validación básica de existencia por SKU en precios vigentes
  SELECT EXISTS (
    SELECT 1 FROM public.v_prices_vigente v
    WHERE v.sku = p_sku
  ) INTO has_any_sku;

  IF NOT has_any_sku THEN
    RAISE EXCEPTION 'NOT_FOUND: no hay precios vigentes para sku %', p_sku
      USING ERRCODE = 'P0002';
  END IF;

  -- 1) Si se pasa moneda, validar que exista al menos un precio vigente en esa moneda
  IF p_currency IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.v_prices_vigente v
      WHERE v.sku = p_sku AND v.currency = p_currency
    ) INTO has_curr_sku;

    IF NOT has_curr_sku THEN
      RAISE EXCEPTION 'INVALID_CURRENCY: no hay precio vigente para sku % en moneda %', p_sku, p_currency
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 2) Determinar el nivel ganador por prioridad (launch > default)
  SELECT v.price_list
  INTO best_level
  FROM public.v_prices_vigente v
  WHERE v.sku = p_sku
    AND (p_currency IS NULL OR v.currency = p_currency)
    AND v.price_list IN ('launch','default')
  ORDER BY CASE v.price_list WHEN 'launch' THEN 1 WHEN 'default' THEN 2 ELSE 99 END
  LIMIT 1;

  IF best_level IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: no hay precios elegibles por prioridad para sku %', p_sku
      USING ERRCODE = 'P0002';
  END IF;

  -- 3) Dentro del nivel ganador, ordenar por recencia y tomar Top 2 para detectar empate "real"
  WITH ranked AS (
    SELECT
      v.stripe_price_id,
      v.amount_cents,
      v.currency,
      v.metadata,
      v.valid_from,
      v.created_at,
      row_number() OVER (
        ORDER BY v.valid_from DESC NULLS LAST, v.created_at DESC
      ) AS rn
    FROM public.v_prices_vigente v
    WHERE v.sku = p_sku
      AND (p_currency IS NULL OR v.currency = p_currency)
      AND v.price_list = best_level
  )
  SELECT r.stripe_price_id, r.amount_cents, r.currency, r.metadata, r.valid_from, r.created_at
  INTO r1
  FROM ranked r
  WHERE r.rn = 1;

  -- Si no hay ganador dentro del nivel → NOT_FOUND
  IF r1 IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: no hay precios vigentes dentro del nivel % para sku %', best_level, p_sku
      USING ERRCODE = 'P0002';
  END IF;

  -- Cargar el segundo candidato, si existe
  SELECT r.valid_from, r.created_at
  INTO r2
  FROM (
    SELECT valid_from, created_at, rn
    FROM (
      SELECT valid_from, created_at,
             row_number() OVER (ORDER BY valid_from DESC NULLS LAST, created_at DESC) AS rn
      FROM public.v_prices_vigente v
      WHERE v.sku = p_sku
        AND (p_currency IS NULL OR v.currency = p_currency)
        AND v.price_list = best_level
    ) s
  ) r
  WHERE r.rn = 2;

  -- 4) Empate estricto: misma recencia exacta
  IF r2 IS NOT NULL
     AND coalesce(r1.valid_from, to_timestamp(0)) = coalesce(r2.valid_from, to_timestamp(0))
     AND r1.created_at = r2.created_at THEN
    RAISE EXCEPTION 'AMBIGUOUS_PRICE: múltiples precios vigentes con misma prioridad y recencia para sku %', p_sku
      USING ERRCODE = 'P0001';
  END IF;

  -- 5) Emitir ganador
  stripe_price_id := r1.stripe_price_id;
  amount_cents    := r1.amount_cents;
  currency        := r1.currency;
  metadata        := r1.metadata;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."f_catalog_price_by_sku"("p_sku" "text", "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text" DEFAULT 'MXN'::"text", "p_price_list" "text" DEFAULT NULL::"text", "p_use_validity" boolean DEFAULT false, "p_allow_fallback" boolean DEFAULT true) RETURNS TABLE("sku" "text", "price_list" "text", "currency" "text", "amount_cents" integer, "billing_interval" "text", "is_subscription" boolean, "product_type" "text", "fulfillment_type" "text", "stripe_product_id" "text", "stripe_price_id" "text", "product_metadata" "jsonb", "price_metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with params as (
    select
      p_sku as sku,
      p_currency as currency,
      p_price_list as price_list,
      p_use_validity as use_validity,
      p_allow_fallback as allow_fallback,
      array['bf','intro','promo','default']::text[] as auto_lists,
      now() as now_at
  ),
  base as (
    select
      pr.sku,
      pr.product_type,
      pr.fulfillment_type,
      pr.is_subscription,
      pr.stripe_product_id,
      pr.metadata as product_metadata,
      pp.price_list,
      pp.currency,
      pp.amount_cents,
      pp."interval" as billing_interval,
      pp.valid_from,
      pp.valid_until,
      pp.active,
      pp.stripe_price_id,
      pp.metadata as price_metadata,
      pp.created_at,
      (pp.valid_from is null or pp.valid_from <= (select p.now_at from params p))
      and (pp.valid_until is null or (select p.now_at from params p) < pp.valid_until) as is_current_valid
    from public.products pr
    join public.product_prices pp on pp.sku = pr.sku
    where pr.sku = (select p.sku from params p)
      and pr.status = 'active'
      and pr.visibility = 'public'
      and pp.active = true
  ),
  t1 as (
    select 1 as tier, b.* from base b cross join params p
    where b.currency = p.currency
      and (
        (p.price_list is not null and b.price_list = p.price_list)
        or
        (p.price_list is null and b.price_list = any(p.auto_lists))
      )
  ),
  t2 as (
    select 2 as tier, b.* from base b cross join params p
    where p.allow_fallback = true
      and b.currency = 'MXN'
      and (
        (p.price_list is not null and b.price_list = p.price_list)
        or
        (p.price_list is null and b.price_list = any(p.auto_lists))
      )
  ),
  t3 as (
    select 3 as tier, b.* from base b cross join params p
    where p.price_list is null
      and b.price_list = 'default'
      and b.currency = p.currency
  ),
  t4 as (
    select 4 as tier, b.* from base b cross join params p
    where p.price_list is null
      and p.allow_fallback = true
      and b.price_list = 'default'
      and b.currency = 'MXN'
  ),
  unioned as (
    select * from t1
    union all select * from t2
    union all select * from t3
    union all select * from t4
  ),
  ranked as (
    select
      u.*,
      row_number() over (
        partition by tier
        order by
          case when (select p.use_validity from params p) then
            case when is_current_valid then 0 else 1 end
          else 0 end,
          case when (select p.use_validity from params p) and is_current_valid then valid_until end asc nulls last,
          case when (select p.use_validity from params p) and not is_current_valid then valid_until end asc nulls last,
          created_at desc
      ) as rn
    from unioned u
  )
  select
    r.sku,
    r.price_list,
    r.currency,
    r.amount_cents,
    r.billing_interval,
    r.is_subscription,
    r.product_type,
    r.fulfillment_type,
    r.stripe_product_id,
    r.stripe_price_id,
    r.product_metadata,
    r.price_metadata
  from ranked r
  where r.rn = 1
  order by r.tier
  limit 1;

  if not found then
    raise exception 'PRICE_NOT_FOUND_FOR_CRITERIA'
      using hint = 'No price matched with given inputs';
  end if;
end;
$$;


ALTER FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text", "p_price_list" "text", "p_use_validity" boolean, "p_allow_fallback" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_contacts_free_class_upsert"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'app'
    AS $$
  SELECT app.f_contacts_free_class_upsert_v1(
    p_contact_id,
    p_class_sku,
    p_instance_slug,
    p_status,
    p_ts
  );
$$;


ALTER FUNCTION "public"."f_contacts_free_class_upsert"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_contacts_marketing_update_v1"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'app'
    AS $$
  SELECT app.f_contacts_marketing_update_v1(p_input);
$$;


ALTER FUNCTION "public"."f_contacts_marketing_update_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_debug_get_entitlements_by_order"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "sku" "text", "fulfillment_type" "text", "source_type" "public"."entitlement_source_type", "source_id" "text", "active" boolean, "valid_until" timestamp with time zone, "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('row_security','off', true);
  RETURN QUERY
  SELECT
    e.id, e.user_id, e.sku, e.fulfillment_type, e.source_type,
    e.source_id::text, e.active, e.valid_until, e.metadata,
    e.created_at, e.updated_at
  FROM public.entitlements e
  WHERE e.source_type = 'order'::entitlement_source_type
    AND e.source_id::uuid = p_order_id
  ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."f_debug_get_entitlements_by_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_debug_get_order"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "order_number" "text", "total_cents" integer, "currency" "text", "status" "text", "stripe_session_id" "text", "stripe_invoice_id" "text", "stripe_subscription_id" "text", "stripe_payment_intent_id" "text", "stripe_customer_id" "text", "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Desactiva RLS para esta ejecución (requiere owner con privilegios)
  PERFORM set_config('row_security','off', true);

  RETURN QUERY
  SELECT
    oh.id,
    oh.user_id,
    oh.order_number,
    oh.total_cents,
    oh.currency,
    oh.status,
    oh.stripe_session_id,
    oh.stripe_invoice_id,
    oh.stripe_subscription_id,
    oh.stripe_payment_intent_id,
    oh.stripe_customer_id,
    oh.metadata,
    oh.created_at,
    oh.updated_at
  FROM public.order_headers oh
  WHERE oh.id = p_order_id;
END;
$$;


ALTER FUNCTION "public"."f_debug_get_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_debug_get_payments_by_order"("p_order_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "order_id" "uuid", "total_cents" integer, "currency" "text", "status" "text", "stripe_invoice_id" "text", "stripe_payment_intent_id" "text", "stripe_subscription_id" "text", "stripe_customer_id" "text", "period_start" timestamp with time zone, "period_end" timestamp with time zone, "metadata" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('row_security','off', true);
  RETURN QUERY
  SELECT
    p.id, p.user_id, p.order_id, p.total_cents, p.currency, p.status,
    p.stripe_invoice_id, p.stripe_payment_intent_id, p.stripe_subscription_id,
    p.stripe_customer_id, p.period_start, p.period_end, p.metadata,
    p.created_at, p.updated_at
  FROM public.payments p
  WHERE p.order_id = p_order_id
     OR p.stripe_invoice_id = (SELECT oh.stripe_invoice_id FROM public.order_headers oh WHERE oh.id = p_order_id);
END;
$$;


ALTER FUNCTION "public"."f_debug_get_payments_by_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_debug_orders_parse_payment_from_payload"("session_payload" "jsonb") RETURNS TABLE("amount_cents" integer, "currency" "text", "seen_total" integer, "seen_amount_paid" integer, "seen_amount_due" integer, "seen_subtotal" integer, "seen_currency" "text", "line0_amount" integer, "line0_price_currency" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_obj jsonb;
BEGIN
  v_obj := session_payload->'data'->'object';

  RETURN QUERY
  SELECT
    f.amount_cents,
    f.currency,
    NULLIF(v_obj->>'total','')::int            AS seen_total,
    NULLIF(v_obj->>'amount_paid','')::int      AS seen_amount_paid,
    NULLIF(v_obj->>'amount_due','')::int       AS seen_amount_due,
    NULLIF(v_obj->>'subtotal','')::int         AS seen_subtotal,
    lower(NULLIF(v_obj->>'currency',''))       AS seen_currency,
    NULLIF(v_obj#>>'{lines,data,0,amount}','')::int AS line0_amount,
    v_obj#>>'{lines,data,0,price,currency}'    AS line0_price_currency
  FROM public.f_orders_parse_payment(v_obj) AS f;
END;
$$;


ALTER FUNCTION "public"."f_debug_orders_parse_payment_from_payload"("session_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_debug_orders_payment_both"("session_payload" "jsonb") RETURNS TABLE("manual_amount_cents" integer, "manual_currency" "text", "parser_amount_cents" integer, "parser_currency" "text", "seen_total" integer, "seen_amount_paid" integer, "seen_amount_due" integer, "seen_subtotal" integer, "seen_currency" "text", "line0_amount" integer, "line0_amount_total" integer, "line0_currency" "text", "line0_price_currency" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_obj            jsonb;
  v_lines_total    integer := 0;
  li               jsonb;
  v_manual_amount  integer;
  v_manual_currency text;
  v_parser_amount  integer;
  v_parser_currency text;
BEGIN
  -- Extrae el objeto como lo hace f_orch_orders_upsert
  v_obj := session_payload->'data'->'object';

  -- Suma por líneas como último recurso
  FOR li IN
    SELECT elem FROM jsonb_array_elements(COALESCE(v_obj #> '{lines,data}', '[]'::jsonb)) AS t(elem)
  LOOP
    v_lines_total := v_lines_total
      + COALESCE(
          NULLIF(li->>'amount','')::int,
          NULLIF(li->>'amount_total','')::int,
          CASE
            WHEN (li #>> '{pricing,price_details,unit_amount_decimal}') IS NOT NULL
                 AND (li->>'quantity') IS NOT NULL
            THEN ((li #>> '{pricing,price_details,unit_amount_decimal}')::numeric
                  * NULLIF(li->>'quantity','')::int)::int
            ELSE NULL
          END,
          0
        );
  END LOOP;

  -- Manual: mismos fallbacks que el parser actualizado
  v_manual_amount := COALESCE(
    NULLIF(v_obj->>'amount_total','')::int,
    NULLIF(v_obj->>'amount_paid','')::int,
    NULLIF(v_obj->>'total','')::int,
    NULLIF(v_obj->>'amount_due','')::int,
    NULLIF(v_obj->>'subtotal','')::int,
    v_lines_total
  );

  v_manual_currency := lower(trim(NULLIF(v_obj->>'currency','')));
  IF v_manual_currency IS NULL OR v_manual_currency = '' THEN
    v_manual_currency := lower(trim(NULLIF((v_obj #> '{lines,data,0}') ->> 'currency','')));
  END IF;
  IF v_manual_currency IS NULL OR v_manual_currency = '' THEN
    v_manual_currency := lower(trim(NULLIF((v_obj #> '{lines,data,0,price}') ->> 'currency','')));
  END IF;

  -- Llamada al parser, capturando errores
  BEGIN
    SELECT f.amount_cents, f.currency
    INTO v_parser_amount, v_parser_currency
    FROM public.f_orders_parse_payment(v_obj) AS f;
  EXCEPTION
    WHEN OTHERS THEN
      v_parser_amount := NULL;
      v_parser_currency := NULL;
  END;

  -- Devuelve ambas lecturas y lo "visto" por el RPC
  RETURN QUERY
  SELECT
    v_manual_amount                         AS manual_amount_cents,
    v_manual_currency                       AS manual_currency,
    v_parser_amount                         AS parser_amount_cents,
    v_parser_currency                       AS parser_currency,
    NULLIF(v_obj->>'total','')::int         AS seen_total,
    NULLIF(v_obj->>'amount_paid','')::int   AS seen_amount_paid,
    NULLIF(v_obj->>'amount_due','')::int    AS seen_amount_due,
    NULLIF(v_obj->>'subtotal','')::int      AS seen_subtotal,
    lower(NULLIF(v_obj->>'currency',''))    AS seen_currency,
    NULLIF(v_obj#>>'{lines,data,0,amount}','')::int         AS line0_amount,
    NULLIF(v_obj#>>'{lines,data,0,amount_total}','')::int   AS line0_amount_total,
    v_obj#>>'{lines,data,0,currency}'       AS line0_currency,
    v_obj#>>'{lines,data,0,price,currency}' AS line0_price_currency;

END;
$$;


ALTER FUNCTION "public"."f_debug_orders_payment_both"("session_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
with u as (
  select id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1
)
select jsonb_build_object(
  'has',
  exists (
    select 1
    from u
    join public.v_entitlements_active vea
      on vea.user_id = u.id
    where vea.sku = p_sku
      and coalesce(vea.active, true) = true
  )
);
$$;


ALTER FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") IS 'Returns {"has":true|false} if the email has an active entitlement for the sku via v_entitlements_active. Case-insensitive email match.';



CREATE OR REPLACE FUNCTION "public"."f_entitlements_apply"("p_user_id" "uuid", "p_order_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_valid_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_actor" "text" DEFAULT 'system:backend'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_entitlement_id uuid;
  v_first_id       uuid;
  v_sku            text;
  v_ft             text;
  v_child          record;
  v_msg            text;
  v_conflict_id    uuid;
  v_was_existing   boolean;
  v_merged         boolean;
  v_has_events     boolean;
BEGIN
  -- Validaciones
  v_sku := nullif(trim(coalesce(p_sku,'')),'');
  IF v_sku IS NULL THEN RAISE EXCEPTION 'INVALID_SKU'; END IF;

  v_ft := lower(trim(coalesce(p_fulfillment_type,'')));
  IF v_ft NOT IN ('course','template','live_class','one_to_one','subscription_grant','bundle') THEN
    RAISE EXCEPTION 'INVALID_FULFILLMENT';
  END IF;

  -- ¿Existe tabla de eventos?
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='entitlement_events' AND c.relkind='r'
  ) INTO v_has_events;

  ---------------------------------------------------------------------------
  -- 1) BUNDLE
  ---------------------------------------------------------------------------
  IF v_ft = 'bundle' THEN
    FOR v_child IN
      SELECT sku, fulfillment_type FROM public.f_bundles_expand_items(v_sku)
    LOOP
      v_was_existing := false;
      v_merged := false;
      v_entitlement_id := NULL;

      -- existente activo
      SELECT e.id
        INTO v_entitlement_id
      FROM public.entitlements e
      WHERE e.user_id = p_user_id
        AND e.sku = v_child.sku
        AND e.active
      ORDER BY e.created_at DESC
      LIMIT 1;

      IF v_entitlement_id IS NOT NULL THEN
        v_was_existing := true;

        -- MERGE inmediato
        UPDATE public.entitlements
           SET metadata    = coalesce(metadata,'{}'::jsonb) || (coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('bundle_parent', v_sku)),
               valid_until = coalesce(p_valid_until, valid_until),
               updated_at  = now()
         WHERE id = v_entitlement_id;
        v_merged := true;

        IF v_has_events THEN
          BEGIN
            INSERT INTO entitlement_events (id, entitlement_id, type, actor, payload, created_at)
            VALUES (
              gen_random_uuid(), v_entitlement_id, 'update', p_actor,
              jsonb_build_object('user_id', p_user_id, 'sku', v_child.sku, 'source_type','order','source_id', p_order_id::text),
              now()
            );
          EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;

      ELSE
        -- Intentar grant
        BEGIN
          v_entitlement_id := public.f_entitlements_grant(
            p_user_id,
            v_child.sku,
            v_child.fulfillment_type,
            'order',
            p_order_id::text,
            coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('bundle_parent', v_sku),
            p_valid_until,
            coalesce(p_actor,'system:backend')
          );
        EXCEPTION WHEN OTHERS THEN
          v_msg := sqlerrm;
          IF position('ACTIVE_CONFLICT:' IN v_msg) > 0 THEN
            v_conflict_id := substring(v_msg FROM 'ACTIVE_CONFLICT:([0-9a-f-]{36})')::uuid;
            v_entitlement_id := v_conflict_id;
            v_was_existing := true;
            -- NOTA: aún no merged; se hará en el post-merge uniforme abajo.
          ELSE
            RAISE;
          END IF;
        END;
      END IF;

      -- Post-merge uniforme para conflictos
      IF v_was_existing AND NOT v_merged AND v_entitlement_id IS NOT NULL THEN
        UPDATE public.entitlements
           SET metadata    = coalesce(metadata,'{}'::jsonb) || (coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('bundle_parent', v_sku)),
               valid_until = coalesce(p_valid_until, valid_until),
               updated_at  = now()
         WHERE id = v_entitlement_id;

        IF v_has_events THEN
          BEGIN
            INSERT INTO entitlement_events (id, entitlement_id, type, actor, payload, created_at)
            VALUES (
              gen_random_uuid(), v_entitlement_id, 'update', p_actor,
              jsonb_build_object('user_id', p_user_id, 'sku', v_child.sku, 'source_type','order','source_id', p_order_id::text),
              now()
            );
          EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;
      END IF;

      -- Renovación suscripción en bundle
      IF v_child.fulfillment_type = 'subscription_grant' AND v_entitlement_id IS NOT NULL THEN
        PERFORM public.f_entitlements_renew_subscription(
          p_entitlement_id := v_entitlement_id,
          p_metadata       := coalesce(p_metadata,'{}'::jsonb),
          p_valid_until    := p_valid_until,
          p_actor          := coalesce(p_actor,'system:backend'),
          p_was_existing   := v_was_existing
        );
      END IF;

      IF v_first_id IS NULL AND v_entitlement_id IS NOT NULL THEN
        v_first_id := v_entitlement_id;
      END IF;
    END LOOP;

    IF v_first_id IS NULL THEN
      RAISE EXCEPTION 'BUNDLE_EMPTY_OR_GRANT_FAILED';
    END IF;

    RETURN v_first_id;
  END IF;

  ---------------------------------------------------------------------------
  -- 2) NO-BUNDLE
  ---------------------------------------------------------------------------
  v_was_existing := false;
  v_merged := false;
  v_entitlement_id := NULL;

  -- existente activo
  SELECT e.id
    INTO v_entitlement_id
  FROM public.entitlements e
  WHERE e.user_id = p_user_id
    AND e.sku = v_sku
    AND e.active
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_entitlement_id IS NOT NULL THEN
    v_was_existing := true;

    -- MERGE inmediato
    UPDATE public.entitlements
       SET metadata    = coalesce(metadata,'{}'::jsonb) || coalesce(p_metadata,'{}'::jsonb),
           valid_until = coalesce(p_valid_until, valid_until),
           updated_at  = now()
     WHERE id = v_entitlement_id;
    v_merged := true;

    IF v_has_events THEN
      BEGIN
        INSERT INTO entitlement_events (id, entitlement_id, type, actor, payload, created_at)
        VALUES (
          gen_random_uuid(), v_entitlement_id, 'update', p_actor,
          jsonb_build_object('user_id', p_user_id, 'sku', v_sku, 'source_type','order','source_id', p_order_id::text),
          now()
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

  ELSE
    -- GRANT nuevo
    BEGIN
      v_entitlement_id := public.f_entitlements_grant(
        p_user_id,
        v_sku,
        v_ft,
        'order',
        p_order_id::text,
        coalesce(p_metadata,'{}'::jsonb),
        p_valid_until,
        coalesce(p_actor,'system:backend')
      );
    EXCEPTION WHEN OTHERS THEN
      v_msg := sqlerrm;
      IF position('ACTIVE_CONFLICT:' IN v_msg) > 0 THEN
        v_conflict_id := substring(v_msg FROM 'ACTIVE_CONFLICT:([0-9a-f-]{36})')::uuid;
        v_entitlement_id := v_conflict_id;
        v_was_existing := true;
        -- NOTA: aún no merged; se hará en el post-merge uniforme abajo.
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  IF v_entitlement_id IS NULL THEN
    RAISE EXCEPTION 'GRANT_FAILED';
  END IF;

  -- Post-merge uniforme para conflictos
  IF v_was_existing AND NOT v_merged THEN
    UPDATE public.entitlements
       SET metadata    = coalesce(metadata,'{}'::jsonb) || coalesce(p_metadata,'{}'::jsonb),
           valid_until = coalesce(p_valid_until, valid_until),
           updated_at  = now()
     WHERE id = v_entitlement_id;

    IF v_has_events THEN
      BEGIN
        INSERT INTO entitlement_events (id, entitlement_id, type, actor, payload, created_at)
        VALUES (
          gen_random_uuid(), v_entitlement_id, 'update', p_actor,
          jsonb_build_object('user_id', p_user_id, 'sku', v_sku, 'source_type','order','source_id', p_order_id::text),
          now()
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END IF;

  -- Renovación para suscripciones
  IF v_ft = 'subscription_grant' THEN
    PERFORM public.f_entitlements_renew_subscription(
      p_entitlement_id := v_entitlement_id,
      p_metadata       := coalesce(p_metadata,'{}'::jsonb),
      p_valid_until    := p_valid_until,
      p_actor          := coalesce(p_actor,'system:backend'),
      p_was_existing   := v_was_existing
    );
  END IF;

  RETURN v_entitlement_id;
END;
$$;


ALTER FUNCTION "public"."f_entitlements_apply"("p_user_id" "uuid", "p_order_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_entitlements_grant"("p_user_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_source_type" "text", "p_source_id" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_valid_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_actor" "text" DEFAULT 'system:backend'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  v_id uuid;
  v_existing_active uuid;
  v_has_events boolean;
  v_source_id_is_uuid boolean;
  v_source_type entitlement_source_type;
begin
  -- Validaciones
  if p_user_id is null
     or coalesce(trim(p_sku),'') = ''
     or coalesce(trim(p_fulfillment_type),'') = ''
     or coalesce(trim(p_source_type),'') = ''
     or coalesce(trim(p_source_id),'') = '' then
    raise exception 'INVALID_ARGUMENT';
  end if;

  p_sku := lower(p_sku);
  p_fulfillment_type := lower(p_fulfillment_type);

  if p_fulfillment_type = 'bundle' then
    raise exception 'BUNDLE_NOT_SUPPORTED';
  end if;

  if p_fulfillment_type not in ('course','template','live_class','one_to_one','subscription_grant') then
    raise exception 'INVALID_FULFILLMENT_TYPE';
  end if;

  -- Enum de source_type
  v_source_type := p_source_type::entitlement_source_type;

  -- Tipo real de source_id en la tabla
  select (c.data_type = 'uuid')
  into v_source_id_is_uuid
  from information_schema.columns c
  where c.table_schema='public' and c.table_name='entitlements' and c.column_name='source_id';

  -- ¿Existe entitlement_events?
  select exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'entitlement_events' and c.relkind = 'r'
  ) into v_has_events;

  -- Idempotencia exacta por (user, sku, source_type, source_id)
  select id
    into v_id
  from entitlements
  where user_id = p_user_id
    and sku = p_sku
    and source_type = v_source_type
    and source_id::text = p_source_id
  limit 1;

  if v_id is not null then
    -- Reactivar si estaba inactivo
    if exists (select 1 from entitlements where id = v_id and active is not true) then
      update entitlements
         set active = true,
             revoked_at = null,
             valid_until = coalesce(p_valid_until, valid_until),
             metadata = coalesce(metadata,'{}'::jsonb) || coalesce(p_metadata,'{}'::jsonb),
             updated_at = now()
       where id = v_id;

      if v_has_events then
        begin
          insert into entitlement_events (id, entitlement_id, type, actor, payload, created_at)
          values (
            gen_random_uuid(), v_id, 'restore', p_actor,
            jsonb_build_object(
              'user_id', p_user_id, 'sku', p_sku,
              'source_type', p_source_type, 'source_id', p_source_id
            ),
            now()
          );
        exception when others then null;
        end;
      end if;
    end if;

    return v_id;
  end if;

  -- Evitar más de un activo por (user, sku)
  select id
    into v_existing_active
  from entitlements
  where user_id = p_user_id
    and sku = p_sku
    and active is true
  limit 1;

  if v_existing_active is not null then
    raise exception 'ACTIVE_CONFLICT:%', v_existing_active;
  end if;

  -- INSERT nuevo grant (ramificando por tipo de source_id para evitar CASE mixto)
  if v_source_id_is_uuid then
    insert into entitlements (
        id, user_id, sku, fulfillment_type, source_type, source_id,
        metadata, active, valid_until
    ) values (
        gen_random_uuid(),
        p_user_id,
        p_sku,
        p_fulfillment_type,
        v_source_type,
        p_source_id::uuid,
        coalesce(p_metadata,'{}'::jsonb),
        true,
        p_valid_until
    )
    returning id into v_id;
  else
    insert into entitlements (
        id, user_id, sku, fulfillment_type, source_type, source_id,
        metadata, active, valid_until
    ) values (
        gen_random_uuid(),
        p_user_id,
        p_sku,
        p_fulfillment_type,
        v_source_type,
        p_source_id, -- text
        coalesce(p_metadata,'{}'::jsonb),
        true,
        p_valid_until
    )
    returning id into v_id;
  end if;

  -- Evento grant
  if v_has_events then
    begin
      insert into entitlement_events (id, entitlement_id, type, actor, payload, created_at)
      values (
        gen_random_uuid(), v_id, 'grant', p_actor,
        jsonb_build_object(
          'user_id', p_user_id, 'sku', p_sku,
          'source_type', p_source_type, 'source_id', p_source_id
        ),
        now()
      );
    exception when others then null;
    end;
  end if;

  return v_id;

exception
  when unique_violation then
    select id into v_existing_active
    from entitlements
    where user_id = p_user_id and sku = p_sku and active is true
    limit 1;
    if v_existing_active is not null then
      raise exception 'ACTIVE_CONFLICT:%', v_existing_active;
    else
      raise;
    end if;
end;$$;


ALTER FUNCTION "public"."f_entitlements_grant"("p_user_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_source_type" "text", "p_source_id" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_entitlements_renew_subscription"("p_entitlement_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_valid_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_actor" "text" DEFAULT 'system:backend'::"text", "p_was_existing" boolean DEFAULT true) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_prev_valid     timestamptz;
  v_target_valid   timestamptz;
  v_invoice_id     text;

  -- Ciclo desde metadata; fallback 1 month
  v_interval_unit  text;
  v_interval_count int;
  v_cycle          interval;
  v_base           timestamptz;
BEGIN
  IF p_entitlement_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ENTITLEMENT';
  END IF;

  v_invoice_id := nullif(p_metadata->>'invoice_id','');

  -- Configurar ciclo
  v_interval_unit  := lower(nullif(p_metadata->>'recurring_interval',''));
  v_interval_count := COALESCE((nullif(p_metadata->>'interval_count',''))::int, 1);
  IF v_interval_unit NOT IN ('day','week','month','year') THEN v_interval_unit := 'month'; END IF;
  IF v_interval_count <= 0 THEN v_interval_count := 1; END IF;
  v_cycle := (v_interval_count || ' ' || v_interval_unit)::interval;

  -- Vigencia objetivo: desde period_end si viene, si no desde base + ciclo
  SELECT valid_until INTO v_prev_valid
  FROM public.entitlements
  WHERE id = p_entitlement_id;

  v_base := GREATEST(now(), COALESCE(v_prev_valid, now()));
  v_target_valid := COALESCE(p_valid_until, v_base + v_cycle);

  IF v_prev_valid IS DISTINCT FROM v_target_valid THEN
    UPDATE public.entitlements
       SET valid_until = v_target_valid,
           updated_at  = now()
     WHERE id = p_entitlement_id;
  END IF;

  -- Evento renew idempotente por invoice_id
  IF p_was_existing THEN
    IF v_invoice_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM public.entitlement_events ee
         WHERE ee.entitlement_id = p_entitlement_id
           AND ee.type = 'renew'
           AND (ee.payload->>'invoice_id') = v_invoice_id
       ) THEN
      INSERT INTO public.entitlement_events(entitlement_id, type, actor, payload, created_at)
      VALUES (
        p_entitlement_id,
        'renew',
        coalesce(p_actor,'system:backend'),
        coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('valid_until', v_target_valid),
        now()
      );
    END IF;
  END IF;

  RETURN v_target_valid;
END;
$$;


ALTER FUNCTION "public"."f_entitlements_renew_subscription"("p_entitlement_id" "uuid", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text", "p_was_existing" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'app'
    AS $$
  select public.f_orch_contact_write_v1(p_input);
$$;


ALTER FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orch_contact_write_v1"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'app'
    AS $$
declare
  v_in           jsonb := coalesce(p_input, '{}'::jsonb);
  v_norm         jsonb;
  v_contact_id   uuid;
  v_message_id   uuid;
  v_event_id     uuid;
  v_existing_msg uuid;
  v_status       text := 'ok';
  v_email        text;
  v_request_id   text;
  v_source_norm  text;
  v_opt_in       boolean;
  v_campaign_id  text := nullif(trim(coalesce(v_in->>'campaign_id','')), '');
begin
  -- 1) Normalizar y validar
  v_norm := app.f_contact_normalize_v1(v_in);
  perform app.f_contact_validate_v1(v_norm);

  v_email       := v_norm->>'email';
  v_request_id  := v_norm->>'request_id';
  v_source_norm := v_norm->>'source';
  v_opt_in      := case when (v_norm ? 'marketing_opt_in') then (v_norm->>'marketing_opt_in')::boolean else false end;

  -- 2) Upsert contacto
  v_contact_id := app.f_contacts_upsert_v1(v_norm);

  -- 3) Idempotencia mensaje
  select id into v_existing_msg
  from public.messages
  where contact_id = v_contact_id
    and metadata->>'request_id' = v_request_id
  for update;

  if found then
    v_status := 'duplicate';
    v_message_id := v_existing_msg;
  else
    v_message_id := app.f_messages_idempotent_v1(v_contact_id, v_norm);
  end if;

  -- 4) Evento de suscripción opcional
  if v_opt_in is true then
    v_event_id := app.f_subscription_events_log_v1(
      v_contact_id,
      jsonb_build_object(
        'event_type','opt_in',
        'source', v_source_norm,
        'campaign_id', v_campaign_id,
        'request_id', v_request_id
      )
    );
  else
    v_event_id := null;
  end if;

  -- 5) Respuesta
  return jsonb_build_object(
    'version','v1',
    'submission_id', v_request_id,
    'status', v_status,
    'contact', jsonb_build_object(
      'id', v_contact_id,
      'email', v_email,
      'consent_status', (select consent_status from public.contacts where id = v_contact_id)
    ),
    'message', jsonb_build_object('id', v_message_id),
    'subscription_event', jsonb_build_object(
      'id', v_event_id,
      'event_type', case when v_event_id is null then null else 'opt_in' end
    ),
    'warnings', '[]'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."f_orch_contact_write_v1"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orch_contact_write_v2"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog', 'app'
    AS $$
  SELECT app.f_orch_contact_write_v2(p_input);
$$;


ALTER FUNCTION "public"."f_orch_contact_write_v2"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orch_orders_upsert"("session_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_event_id          text;
  v_type              text;
  v_obj               jsonb;

  v_user_id           uuid;

  v_session_id        text;
  v_invoice_id        text;
  v_subscription_id   text;

  v_amount_cents      int;
  v_currency          text;

  v_sku               text;
  v_fulfillment_type  text;

  v_order_id          uuid;

  v_processed_at      timestamptz;
  v_existing_order_id uuid;

  v_metadata          jsonb;
  v_payment_intent    text;
  v_customer          text;

  v_period_end_txt    text;
  v_period_end        timestamptz;
  v_interval_unit     text;
  v_interval_count    int;
  v_price_id          text;

  v_payment_id        uuid;
BEGIN
  -- 1) Validar inputs
  v_event_id := session_payload->>'stripe_event_id';
  v_type     := session_payload->>'type';
  IF v_event_id IS NULL OR v_event_id = '' OR v_type IS NULL OR v_type = '' THEN
    RAISE EXCEPTION 'INVALID_EVENT';
  END IF;
  IF v_type NOT IN ('checkout.session.completed','invoice.payment_succeeded') THEN
    RAISE EXCEPTION 'INVALID_EVENT';
  END IF;

  -- 2) Log e idempotencia
  PERFORM f_webhooks_log_event(v_event_id, v_type, session_payload);
  SELECT we.order_id, we.processed_at
    INTO v_existing_order_id, v_processed_at
  FROM webhook_events we
  WHERE we.stripe_event_id = v_event_id;
  IF v_processed_at IS NOT NULL AND v_existing_order_id IS NOT NULL THEN
    RETURN v_existing_order_id;
  END IF;

  -- 3) Extraer objeto
  v_obj := session_payload->'data'->'object';
  IF v_obj IS NULL THEN
    RAISE EXCEPTION 'INVALID_EVENT';
  END IF;

  -- 4) Resolver usuario
  v_user_id := f_orders_resolve_user(v_obj);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND_USER';
  END IF;

  -- 5) Parsear llaves
  SELECT session_id, invoice_id, subscription_id
    INTO v_session_id, v_invoice_id, v_subscription_id
  FROM f_orders_parse_keys(v_obj, v_type);
  IF v_session_id IS NULL AND v_invoice_id IS NULL AND v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_KEYS';
  END IF;

  -- 6) Parseo de pago
  v_amount_cents := NULL;
  v_currency := NULL;
  BEGIN
    SELECT amount_cents, currency
      INTO v_amount_cents, v_currency
    FROM public.f_orders_parse_payment(v_obj);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  IF COALESCE(v_amount_cents, 0) <= 0 OR v_currency IS NULL OR v_currency = '' THEN
    v_amount_cents := COALESCE(
      NULLIF(v_obj->>'amount_total','')::int,
      NULLIF(v_obj->>'amount_paid','')::int,
      NULLIF(v_obj->>'total','')::int,
      NULLIF(v_obj->>'amount_due','')::int,
      NULLIF(v_obj->>'subtotal','')::int
    );
    v_currency := lower(trim(NULLIF(v_obj->>'currency','')));
    IF COALESCE(v_amount_cents, 0) <= 0 OR v_currency IS NULL OR v_currency = '' THEN
      RAISE EXCEPTION 'INVALID_PAYMENT';
    END IF;
  END IF;

  -- 7) Metadata base y atributos
  SELECT sku, fulfillment_type INTO v_sku, v_fulfillment_type
  FROM f_orders_parse_metadata(v_obj);
  IF v_sku IS NULL OR v_sku = '' OR v_fulfillment_type IS NULL OR v_fulfillment_type = '' THEN
    RAISE EXCEPTION 'INVALID_FULFILLMENT';
  END IF;

  v_price_id := COALESCE(
    NULLIF(v_obj->'line_items'->'data'->0->'price'->>'id',''),
    NULLIF(v_obj->'lines'->'data'->0->'price'->>'id',''),
    NULLIF(v_obj->'line_items'->'data'->0->'pricing'->'price_details'->>'price',''),
    NULLIF(v_obj->'lines'->'data'->0->'pricing'->'price_details'->>'price','')
  );

  v_payment_intent := v_obj->>'payment_intent';
  v_customer       := COALESCE(v_obj->>'customer', (v_obj->'customer_details'->>'id'));

  v_metadata := COALESCE(v_obj->'metadata','{}'::jsonb)
                || jsonb_build_object(
                     'sku', v_sku,
                     'fulfillment_type', v_fulfillment_type,
                     'subscription_id', v_subscription_id,
                     'customer_id', v_customer,
                     'price_id', v_price_id
                   );

  ---------------------------------------------------------------------------
  -- 8) Ramas por tipo de evento
  ---------------------------------------------------------------------------
  IF v_type = 'checkout.session.completed' THEN

    v_order_id := f_order_headers_upsert(
      v_user_id, v_amount_cents, v_currency, 'paid',
      v_session_id, v_invoice_id, v_subscription_id,
      v_payment_intent, v_customer, v_metadata
    );

    PERFORM f_entitlements_apply(
      v_user_id, v_order_id, v_sku, v_fulfillment_type, v_metadata
    );

  ELSE
    -- 8B) invoice.payment_succeeded

    /* ---------------------------------------------------------
       FIX: asegurar que la orden reciba el payment_intent real.
       Stripe lo entrega en invoice.payment_intent a nivel raíz.
       --------------------------------------------------------- */
    IF v_payment_intent IS NULL OR v_payment_intent = '' THEN
      v_payment_intent := v_obj->>'payment_intent';
    END IF;
    /* ------------------------------------------------------- */

    v_order_id := f_order_headers_upsert(
      v_user_id, v_amount_cents, v_currency, 'paid',
      v_session_id, v_invoice_id, v_subscription_id,
      v_payment_intent, v_customer, v_metadata
    );

    BEGIN
      SELECT public.f_payments_upsert(v_user_id, v_obj, v_order_id)
        INTO v_payment_id;

      UPDATE public.payments
         SET order_id = v_order_id
       WHERE id = v_payment_id
         AND (order_id IS NULL OR order_id <> v_order_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    v_period_end_txt := v_obj->'lines'->'data'->0->'period'->>'end';
    IF v_period_end_txt ~ '^\d+(\.\d+)?$' THEN
      v_period_end := to_timestamp(v_period_end_txt::double precision);
    ELSIF v_period_end_txt IS NOT NULL AND v_period_end_txt <> '' THEN
      BEGIN
        v_period_end := v_period_end_txt::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        v_period_end := NULL;
      END;
    END IF;

    v_interval_unit  := lower(NULLIF(v_obj->'lines'->'data'->0->'price'->'recurring'->>'interval',''));
    v_interval_count := COALESCE((NULLIF(v_obj->'lines'->'data'->0->'price'->'recurring'->>'interval_count',''))::int, 1);

    v_metadata := v_metadata
                  || jsonb_build_object(
                       'invoice_id',         v_invoice_id,
                       'subscription_id',    v_subscription_id,
                       'recurring_interval', v_interval_unit,
                       'interval_count',     v_interval_count
                     );

    PERFORM f_entitlements_apply(
      v_user_id, v_order_id, v_sku, v_fulfillment_type, v_metadata, v_period_end, 'system:backend'
    );
  END IF;

  PERFORM f_webhooks_mark_processed(v_event_id, v_order_id);
  RETURN v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$_$;


ALTER FUNCTION "public"."f_orch_orders_upsert"("session_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_order_headers_upsert"("p_user_id" "uuid", "p_total_cents" integer, "p_currency" "text", "p_status" "text" DEFAULT 'paid'::"text", "p_stripe_session_id" "text" DEFAULT NULL::"text", "p_stripe_invoice_id" "text" DEFAULT NULL::"text", "p_stripe_subscription_id" "text" DEFAULT NULL::"text", "p_stripe_payment_intent_id" "text" DEFAULT NULL::"text", "p_stripe_customer_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_order_id     uuid;
  v_attempt      int  := 0;
  v_constraint   text;
  v_order_number text;
begin
  -- Validaciones mínimas
  if p_total_cents is null or p_total_cents <= 0 then
    raise exception 'INVALID_TOTAL_CENTS';
  end if;

  if coalesce(trim(p_currency),'') = '' then
    raise exception 'INVALID_CURRENCY';
  end if;

  if lower(p_status) not in ('paid','refunded','canceled','unpaid') then
    raise exception 'INVALID_STATUS';
  end if;

  -- Buscar orden existente por cualquier clave de Stripe
  select oh.id
    into v_order_id
  from public.order_headers oh
  where (p_stripe_session_id         is not null and oh.stripe_session_id         = p_stripe_session_id)
     or (p_stripe_invoice_id         is not null and oh.stripe_invoice_id         = p_stripe_invoice_id)
     or (p_stripe_subscription_id    is not null and oh.stripe_subscription_id    = p_stripe_subscription_id)
     or (p_stripe_payment_intent_id  is not null and oh.stripe_payment_intent_id  = p_stripe_payment_intent_id)
  order by oh.created_at
  limit 1;

  if v_order_id is not null then
    -- UPDATE: completar datos faltantes; no tocar order_number
    update public.order_headers oh
       set total_cents               = coalesce(oh.total_cents, p_total_cents),
           currency                  = coalesce(oh.currency, lower(p_currency)),
           status                    = case when oh.status = 'paid' then oh.status else lower(p_status) end,
           stripe_session_id         = coalesce(oh.stripe_session_id, p_stripe_session_id),
           stripe_invoice_id         = coalesce(oh.stripe_invoice_id, p_stripe_invoice_id),
           stripe_subscription_id    = coalesce(oh.stripe_subscription_id, p_stripe_subscription_id),
           stripe_payment_intent_id  = coalesce(oh.stripe_payment_intent_id, p_stripe_payment_intent_id),
           stripe_customer_id        = coalesce(oh.stripe_customer_id, p_stripe_customer_id),
           metadata                  = coalesce(oh.metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
           updated_at                = now()
     where oh.id = v_order_id;

  else
    -- INSERT con retry por colisión de order_number
    loop
      v_attempt := v_attempt + 1;
      begin
        v_order_number := public.f_orders_new_order_number();

        insert into public.order_headers (
          id,
          user_id,
          order_number,
          total_cents,
          currency,
          status,
          stripe_session_id,
          stripe_invoice_id,
          stripe_subscription_id,
          stripe_payment_intent_id,
          stripe_customer_id,
          metadata,
          created_at,
          updated_at
        )
        values (
          gen_random_uuid(),
          p_user_id,
          v_order_number,
          p_total_cents,
          lower(p_currency),
          lower(p_status),
          p_stripe_session_id,
          p_stripe_invoice_id,
          p_stripe_subscription_id,
          p_stripe_payment_intent_id,
          p_stripe_customer_id,
          coalesce(p_metadata,'{}'::jsonb),
          now(),
          null
        )
        returning id into v_order_id;

        exit; -- éxito

      exception when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint = 'ux_order_headers_order_number' and v_attempt < 3 then
          -- reintenta con un nuevo número
          continue;
        else
          raise;
        end if;
      end;
    end loop;
  end if;

  return v_order_id;
end;
$$;


ALTER FUNCTION "public"."f_order_headers_upsert"("p_user_id" "uuid", "p_total_cents" integer, "p_currency" "text", "p_status" "text", "p_stripe_session_id" "text", "p_stripe_invoice_id" "text", "p_stripe_subscription_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orders_new_order_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$declare
  v_seq bigint;
begin
  v_seq := nextval('public.seq_order_headers_order_number');
  return 'ORD-' || lpad(v_seq::text, 6, '0'); -- cumple ^ORD-\d{6}$;
end;$_$;


ALTER FUNCTION "public"."f_orders_new_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orders_parse_keys"("p_obj" "jsonb", "p_event_type" "text") RETURNS TABLE("session_id" "text", "invoice_id" "text", "subscription_id" "text")
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_event_type text;
BEGIN
  v_event_type := lower(trim(p_event_type));

  IF v_event_type = 'checkout.session.completed' THEN
    session_id      := nullif(p_obj->>'id', '');
    invoice_id      := nullif(p_obj->>'invoice', '');
    subscription_id := nullif(p_obj->>'subscription', '');

  ELSIF v_event_type = 'invoice.payment_succeeded' THEN
    session_id      := NULL;                                -- no aplica
    invoice_id      := nullif(p_obj->>'id', '');            -- in_...
    IF invoice_id IS NULL THEN
      invoice_id := nullif(p_obj->>'invoice', '');          -- fallback
    END IF;
    subscription_id := nullif(p_obj->>'subscription', '');

  ELSE
    RAISE EXCEPTION 'INVALID_EVENT';
  END IF;

  IF session_id IS NULL AND invoice_id IS NULL AND subscription_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_KEYS';
  END IF;

  RETURN QUERY SELECT session_id, invoice_id, subscription_id;
END;
$$;


ALTER FUNCTION "public"."f_orders_parse_keys"("p_obj" "jsonb", "p_event_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orders_parse_metadata"("p_obj" "jsonb") RETURNS TABLE("sku" "text", "fulfillment_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_md        jsonb;
  v_price_id  text;
  v_sku       text;
  v_ft        text;
BEGIN
  -- 1) Metadata directo: PRICE → PRODUCT
  v_md := coalesce(
    -- checkout.session
    p_obj->'line_items'->'data'->0->'price'->'metadata',
    p_obj->'line_items'->0->'price'->'metadata',
    p_obj->'line_items'->'data'->0->'pricing'->'price_details'->'price'->'metadata',
    p_obj->'line_items'->0->'pricing'->'price_details'->'price'->'metadata',

    -- invoice.payment_succeeded
    p_obj->'lines'->'data'->0->'price'->'metadata',
    p_obj->'lines'->0->'price'->'metadata',
    p_obj->'lines'->'data'->0->'pricing'->'price_details'->'price'->'metadata',
    p_obj->'lines'->0->'pricing'->'price_details'->'price'->'metadata',

    -- PRODUCT fallback
    p_obj->'line_items'->'data'->0->'price'->'product'->'metadata',
    p_obj->'line_items'->0->'price'->'product'->'metadata',
    p_obj->'line_items'->'data'->0->'pricing'->'price_details'->'price'->'product'->'metadata',
    p_obj->'line_items'->0->'pricing'->'price_details'->'price'->'product'->'metadata',

    p_obj->'lines'->'data'->0->'price'->'product'->'metadata',
    p_obj->'lines'->0->'price'->'product'->'metadata',
    p_obj->'lines'->'data'->0->'pricing'->'price_details'->'price'->'product'->'metadata',
    p_obj->'lines'->0->'pricing'->'price_details'->'price'->'product'->'metadata',
    '{}'::jsonb
  );

  v_sku := nullif(trim(v_md->>'sku'), '');
  v_ft  := lower(trim(nullif(v_md->>'fulfillment_type','')));

  IF v_sku IS NOT NULL AND v_ft IN ('course','template','live_class','one_to_one','subscription_grant','bundle') THEN
    RETURN QUERY SELECT v_sku, v_ft;
  END IF;

  -- 2) Fallback por price_id (price.id o pricing.price_details.price)
  v_price_id := coalesce(
    -- checkout.session
    p_obj->'line_items'->'data'->0->'price'->>'id',
    p_obj->'line_items'->0->'price'->>'id',
    p_obj->'line_items'->'data'->0->'pricing'->'price_details'->>'price',
    p_obj->'line_items'->0->'pricing'->'price_details'->>'price',
    -- invoice
    p_obj->'lines'->'data'->0->'price'->>'id',
    p_obj->'lines'->0->'price'->>'id',
    p_obj->'lines'->'data'->0->'pricing'->'price_details'->>'price',
    p_obj->'lines'->0->'pricing'->'price_details'->>'price',
    NULL
  );

  IF v_price_id IS NOT NULL THEN
    -- 2A) product_prices
    SELECT
      coalesce(pp.sku, nullif(trim(pp.metadata->>'sku'), '')),
      lower(trim(nullif(pp.metadata->>'fulfillment_type','')))
    INTO v_sku, v_ft
    FROM product_prices pp
    WHERE pp.stripe_price_id = v_price_id
    ORDER BY pp.created_at DESC
    LIMIT 1;

    -- 2B) v_prices_vigente
    IF v_sku IS NULL OR v_ft IS NULL OR v_ft NOT IN ('course','template','live_class','one_to_one','subscription_grant','bundle') THEN
      BEGIN
        SELECT
          v.sku,
          lower(trim(coalesce(v.metadata->>'fulfillment_type','')))
        INTO v_sku, v_ft
        FROM v_prices_vigente v
        WHERE v.stripe_price_id = v_price_id
        ORDER BY v.created_at DESC
        LIMIT 1;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END IF;

  -- 3) Validaciones finales
  IF v_sku IS NULL OR v_sku = '' THEN
    RAISE EXCEPTION 'INVALID_METADATA_PRICE: missing sku for price_id=%', coalesce(v_price_id,'<NULL>');
  END IF;

  IF v_ft NOT IN ('course','template','live_class','one_to_one','subscription_grant','bundle') THEN
    RAISE EXCEPTION 'INVALID_FULFILLMENT: fulfillment_type=% for price_id=%', coalesce(v_ft,'<null>'), coalesce(v_price_id,'<NULL>');
  END IF;

  RETURN QUERY SELECT v_sku, v_ft;
END;
$$;


ALTER FUNCTION "public"."f_orders_parse_metadata"("p_obj" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orders_parse_payment"("p_obj" "jsonb") RETURNS TABLE("amount_cents" integer, "currency" "text")
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_amount        integer;
  v_currency      text;
  v_lines_total   integer := 0;
  li              jsonb;
  v_unit_dec      numeric;
  v_qty           integer;
BEGIN
  -- Suma por líneas como último recurso (invoice/line_item)
  FOR li IN SELECT elem FROM jsonb_array_elements(p_obj #> '{lines,data}') AS t(elem)
  LOOP
    v_lines_total := v_lines_total
      + COALESCE(
          NULLIF(li->>'amount','')::int,
          NULLIF(li->>'amount_total','')::int,
          -- unit_amount_decimal * quantity (si viene en price_details)
          (
            CASE
              WHEN (li #>> '{pricing,price_details,unit_amount_decimal}') IS NOT NULL
                   AND (li->>'quantity') IS NOT NULL THEN
                ((li #>> '{pricing,price_details,unit_amount_decimal}')::numeric
                 * NULLIF(li->>'quantity','')::int)::int
              ELSE NULL
            END
          ),
          0
        );
  END LOOP;

  -- Monto en orden de preferencia:
  v_amount := COALESCE(
    NULLIF(p_obj->>'amount_total','')::int,  -- checkout.session
    NULLIF(p_obj->>'amount_paid','')::int,   -- invoice
    NULLIF(p_obj->>'total','')::int,         -- invoice total
    NULLIF(p_obj->>'amount_due','')::int,    -- invoice due
    NULLIF(p_obj->>'subtotal','')::int,      -- invoice subtotal
    v_lines_total                             -- suma de líneas
  );

  -- Moneda normalizada con fallbacks a líneas
  v_currency := lower(trim(NULLIF(p_obj->>'currency','')));
  IF v_currency IS NULL OR v_currency = '' THEN
    v_currency := lower(trim(NULLIF((p_obj #> '{lines,data,0}') ->> 'currency','')));
  END IF;
  IF v_currency IS NULL OR v_currency = '' THEN
    v_currency := lower(trim(NULLIF((p_obj #> '{lines,data,0,price}') ->> 'currency','')));
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 OR v_currency IS NULL OR v_currency = '' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT';
  END IF;

  RETURN QUERY SELECT v_amount, v_currency;
END;
$$;


ALTER FUNCTION "public"."f_orders_parse_payment"("p_obj" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_orders_resolve_user"("p_obj" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_email   text;
  v_user_id uuid;
BEGIN
  -- Extrae y normaliza email desde el payload de Stripe
  v_email := lower(trim(coalesce(
    p_obj->'customer_details'->>'email',
    p_obj->>'customer_email',
    ''
  )));

  -- Wrapper neutro: si email vacío o inválido, devuelve NULL
  IF v_email = '' OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RETURN NULL;
  END IF;

  -- Resuelve user_id; f_auth_get_user retorna UUID o NULL
  v_user_id := public.f_auth_get_user(v_email);

  RETURN v_user_id;
END;
$_$;


ALTER FUNCTION "public"."f_orders_resolve_user"("p_obj" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_payments_upsert"("p_user_id" "uuid", "p_obj" "jsonb", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_payment_id           uuid;
  v_invoice_id           text;
  v_payment_intent_id    text;
  v_subscription_id      text;
  v_customer_id          text;
  v_total_cents          int;
  v_currency             text;
  v_period_start_txt     text;
  v_period_end_txt       text;
  v_period_start         timestamptz;
  v_period_end           timestamptz;
  v_sku                  text;
  v_fulfillment_type     text;
  v_price_id             text;
  v_md                   jsonb;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'INVALID_USER'; END IF;
  IF p_obj    IS NULL THEN RAISE EXCEPTION 'INVALID_OBJECT'; END IF;

  -- Claves base
  v_invoice_id        := NULLIF(p_obj->>'id','');
  v_payment_intent_id := NULLIF(p_obj->>'payment_intent','');
  v_subscription_id   := NULLIF(p_obj->>'subscription','');
  v_customer_id       := NULLIF(COALESCE(p_obj->>'customer', p_obj->'customer_details'->>'id'), '');

  -- Importe robusto
  v_total_cents := NULL;  v_currency := NULL;
  BEGIN
    SELECT amount_cents, currency
      INTO v_total_cents, v_currency
    FROM public.f_orders_parse_payment($2);
  EXCEPTION WHEN OTHERS THEN
    -- fallback
  END;
  IF COALESCE(v_total_cents,0) <= 0 OR v_currency IS NULL OR v_currency='' THEN
    v_total_cents := COALESCE(
      NULLIF($2->>'amount_total','')::int,
      NULLIF($2->>'amount_paid','')::int,
      NULLIF($2->>'total','')::int,
      NULLIF($2->>'amount_due','')::int,
      NULLIF($2->>'subtotal','')::int
    );
    v_currency := lower(trim(NULLIF($2->>'currency','')));
    IF COALESCE(v_total_cents,0) <= 0 OR v_currency IS NULL OR v_currency='' THEN
      RAISE EXCEPTION 'INVALID_PAYMENT';
    END IF;
  END IF;

  -- Periodo
  v_period_start_txt := $2->'lines'->'data'->0->'period'->>'start';
  v_period_end_txt   := $2->'lines'->'data'->0->'period'->>'end';
  IF v_period_start_txt ~ '^\d+(\.\d+)?$' THEN
    v_period_start := to_timestamp(v_period_start_txt::double precision);
  ELSIF v_period_start_txt IS NOT NULL AND v_period_start_txt <> '' THEN
    BEGIN v_period_start := v_period_start_txt::timestamptz; EXCEPTION WHEN OTHERS THEN v_period_start := NULL; END;
  END IF;
  IF v_period_end_txt ~ '^\d+(\.\d+)?$' THEN
    v_period_end := to_timestamp(v_period_end_txt::double precision);
  ELSIF v_period_end_txt IS NOT NULL AND v_period_end_txt <> '' THEN
    BEGIN v_period_end := v_period_end_txt::timestamptz; EXCEPTION WHEN OTHERS THEN v_period_end := NULL; END;
  END IF;

  -- SKU y fulfillment_type (usa función con fallback a product_prices)
  BEGIN
    SELECT sku, fulfillment_type
      INTO v_sku, v_fulfillment_type
    FROM public.f_orders_parse_metadata($2);
  EXCEPTION WHEN OTHERS THEN
    v_sku := NULLIF(COALESCE(
      $2#>>'{lines,data,0,price,metadata,sku}',
      $2#>>'{lines,data,0,price,product,metadata,sku}'
    ), '');
    v_fulfillment_type := NULLIF(COALESCE(
      $2#>>'{lines,data,0,price,metadata,fulfillment_type}',
      $2#>>'{lines,data,0,price,product,metadata,fulfillment_type}'
    ), '');
  END;
  IF v_sku IS NULL OR v_sku='' OR v_fulfillment_type IS NULL OR v_fulfillment_type='' THEN
    RAISE EXCEPTION 'INVALID_METADATA';
  END IF;

  -- price_id robusto: soporta objetos expandidos y payloads compactos
  v_price_id := COALESCE(
    NULLIF($2->'lines'->'data'->0->'price'->>'id',''),
    NULLIF($2->'lines'->'data'->0->'pricing'->'price_details'->>'price',''),
    NULLIF($2->'line_items'->'data'->0->'price'->>'id',''),
    NULLIF($2->'line_items'->'data'->0->'pricing'->'price_details'->>'price','')
  );

  -- Metadata combinada
  v_md := COALESCE($2->'metadata','{}'::jsonb)
          || jsonb_build_object(
               'sku', v_sku,
               'fulfillment_type', v_fulfillment_type,
               'subscription_id', v_subscription_id,
               'customer_id', v_customer_id
             );
  IF v_price_id IS NOT NULL AND v_price_id <> '' THEN
    v_md := v_md || jsonb_build_object('price_id', v_price_id);
  END IF;

  -- Upsert por invoice / payment_intent
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE (v_invoice_id IS NOT NULL AND stripe_invoice_id = v_invoice_id)
     OR (v_payment_intent_id IS NOT NULL AND stripe_payment_intent_id = v_payment_intent_id)
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    INSERT INTO public.payments (
      user_id, order_id, total_cents, currency, status,
      stripe_invoice_id, stripe_payment_intent_id,
      stripe_subscription_id, stripe_customer_id, stripe_charge_id,
      period_start, period_end, metadata
    )
    VALUES (
      p_user_id, p_order_id, v_total_cents, v_currency, 'paid',
      v_invoice_id, v_payment_intent_id,
      v_subscription_id, v_customer_id, NULL,
      v_period_start, v_period_end, v_md
    )
    RETURNING id INTO v_payment_id;
  ELSE
    UPDATE public.payments
       SET user_id                  = p_user_id,
           order_id                 = COALESCE(p_order_id, order_id),
           total_cents              = v_total_cents,
           currency                 = v_currency,
           status                   = 'paid',
           stripe_invoice_id        = COALESCE(v_invoice_id, stripe_invoice_id),
           stripe_payment_intent_id = COALESCE(v_payment_intent_id, stripe_payment_intent_id),
           stripe_subscription_id   = COALESCE(v_subscription_id, stripe_subscription_id),
           stripe_customer_id       = COALESCE(v_customer_id, stripe_customer_id),
           period_start             = COALESCE(v_period_start, period_start),
           period_end               = COALESCE(v_period_end, period_end),
           metadata                 = metadata || v_md,
           updated_at               = now()
     WHERE id = v_payment_id
     RETURNING id INTO v_payment_id;
  END IF;

  RETURN v_payment_id;
END;
$_$;


ALTER FUNCTION "public"."f_payments_upsert"("p_user_id" "uuid", "p_obj" "jsonb", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_payments_upsert_by_session"("p_payment_intent" "jsonb", "p_session" "jsonb", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("payment_id" "uuid", "order_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id    uuid;
  v_session_id text;
  v_pi_id      text;
  v_order_id   uuid;
  v_pid        uuid;
  v_obj_norm   jsonb;
BEGIN
  IF p_session IS NULL THEN RAISE EXCEPTION 'INVALID_SESSION'; END IF;
  IF p_payment_intent IS NULL THEN RAISE EXCEPTION 'INVALID_OBJECT'; END IF;

  v_user_id := public.f_orders_resolve_user(p_session);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND_FROM_SESSION'; END IF;

  v_obj_norm :=
    (p_payment_intent - 'id')
    || jsonb_build_object(
         'payment_intent', p_payment_intent->>'id',
         'amount_total',   COALESCE((p_payment_intent->>'amount_received')::int, (p_payment_intent->>'amount')::int),
         'currency',       lower(NULLIF(p_payment_intent->>'currency','')),
         'line_items', jsonb_build_object(
           'data', jsonb_build_array(
             jsonb_build_object(
               'price', jsonb_build_object(
                 'id', NULLIF(p_session->'metadata'->>'price_id',''),
                 'metadata', jsonb_build_object(
                   'sku',               NULLIF(p_session->'metadata'->>'sku',''),
                   'fulfillment_type',  NULLIF(p_session->'metadata'->>'fulfillment_type','')
                 )
               )
             )
           )
         )
       );

  v_order_id := p_order_id;
  v_session_id := NULLIF(p_session->>'id','');
  v_pi_id      := NULLIF(p_payment_intent->>'id','');

  IF v_order_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT oh.id INTO v_order_id
    FROM public.order_headers oh
    WHERE oh.stripe_session_id = v_session_id
    ORDER BY oh.created_at DESC
    LIMIT 1;
  END IF;

  IF v_order_id IS NULL AND v_pi_id IS NOT NULL THEN
    SELECT oh.id INTO v_order_id
    FROM public.order_headers oh
    WHERE oh.stripe_payment_intent_id = v_pi_id
       OR oh.metadata->>'payment_intent' = v_pi_id
    ORDER BY oh.created_at DESC
    LIMIT 1;
  END IF;

  v_pid := public.f_payments_upsert(v_user_id, v_obj_norm, v_order_id);

  -- Emitir la fila:
  RETURN QUERY SELECT v_pid, v_order_id;
END;
$$;


ALTER FUNCTION "public"."f_payments_upsert_by_session"("p_payment_intent" "jsonb", "p_session" "jsonb", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _scope        text := coalesce(v_input->>'scope','forms');
  _type         text := v_input->>'type';

  _ip_hash      text := v_input->>'ip_hash';
  _email_hash   text := nullif(v_input->>'email_hash','');

  _b_minutes    int  := coalesce((v_input->'burst'->>'window_minutes')::int, 1);
  _b_ip_thr     int  := coalesce((v_input->'burst'->'thresholds'->>'ip')::int, 3);
  _b_em_thr     int  := coalesce((v_input->'burst'->'thresholds'->>'email')::int, 2);

  _s_minutes    int  := coalesce((v_input->'sustained'->>'window_minutes')::int, 10);
  _s_ip_thr     int  := coalesce((v_input->'sustained'->'thresholds'->>'ip')::int, 8);
  _s_em_thr     int  := coalesce((v_input->'sustained'->'thresholds'->>'email')::int, 3);

  _now          timestamptz := now();
  _burst_start  timestamptz := date_trunc('minute', _now) - make_interval(mins => extract(minute from _now)::int % _b_minutes);
  _sust_start   timestamptz := date_trunc('minute', _now) - make_interval(mins => extract(minute from _now)::int % _s_minutes);

  _ip_burst       int := 0;
  _em_burst       int := 0;
  _ip_sustained   int := 0;
  _em_sustained   int := 0;

  _limited     boolean := false;
  _reason      text := null;
begin
  if _type is null then
    return jsonb_build_object('limited', false, 'reason', null, 'ip_burst',0,'email_burst',0,'ip_sustained',0,'email_sustained',0);
  end if;

  -- Upsert IP burst
  insert into public.rate_limits(scope,type,bucket,key_hash,window_started_at,count,updated_at)
  values(_scope,_type,'burst',_ip_hash,_burst_start,1,_now)
  on conflict(scope,type,bucket,key_hash,window_started_at)
  do update set count = public.rate_limits.count + 1, updated_at = excluded.updated_at
  returning count into _ip_burst;

  -- Upsert IP sustained
  insert into public.rate_limits(scope,type,bucket,key_hash,window_started_at,count,updated_at)
  values(_scope,_type,'sustained',_ip_hash,_sust_start,1,_now)
  on conflict(scope,type,bucket,key_hash,window_started_at)
  do update set count = public.rate_limits.count + 1, updated_at = excluded.updated_at
  returning count into _ip_sustained;

  -- Email puede ser null: solo cuenta si viene
  if _email_hash is not null then
    insert into public.rate_limits(scope,type,bucket,key_hash,window_started_at,count,updated_at)
    values(_scope,_type,'burst',_email_hash,_burst_start,1,_now)
    on conflict(scope,type,bucket,key_hash,window_started_at)
    do update set count = public.rate_limits.count + 1, updated_at = excluded.updated_at
    returning count into _em_burst;

    insert into public.rate_limits(scope,type,bucket,key_hash,window_started_at,count,updated_at)
    values(_scope,_type,'sustained',_email_hash,_sust_start,1,_now)
    on conflict(scope,type,bucket,key_hash,window_started_at)
    do update set count = public.rate_limits.count + 1, updated_at = excluded.updated_at
    returning count into _em_sustained;
  else
    _em_burst := 0;
    _em_sustained := 0;
  end if;

  -- Decisión
  if _ip_burst > _b_ip_thr then
    _limited := true; _reason := 'ip_burst';
  elsif _em_burst > _b_em_thr then
    _limited := true; _reason := 'email_burst';
  elsif _ip_sustained > _s_ip_thr then
    _limited := true; _reason := 'ip_sustained';
  elsif _em_sustained > _s_em_thr then
    _limited := true; _reason := 'email_sustained';
  end if;

  return jsonb_build_object(
    'limited', _limited,
    'reason',  coalesce(_reason,null),
    'ip_burst', _ip_burst,
    'email_burst', _em_burst,
    'ip_sustained', _ip_sustained,
    'email_sustained', _em_sustained
  );
end;
$$;


ALTER FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") IS 'Rate limit touch: incrementa y evalúa conteos burst/sustained por IP y email. SECURITY DEFINER. Usar con service_role.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "order_id" "uuid"
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_webhookevents_getbystripeid"("p_stripe_event_id" "text") RETURNS "public"."webhook_events"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_row public.webhook_events%rowtype;
begin
  select *
    into v_row
  from public.webhook_events
  where stripe_event_id = p_stripe_event_id
  order by received_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."f_webhookevents_getbystripeid"("p_stripe_event_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."f_webhookevents_getbystripeid"("p_stripe_event_id" "text") IS 'Busca en webhook_events por stripe_event_id y devuelve la fila completa o NULL. Uso: backend con service_role.';



CREATE OR REPLACE FUNCTION "public"."f_webhooks_log_event"("p_stripe_event_id" "text", "p_type" "text", "p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Validaciones básicas
  if coalesce(trim(p_stripe_event_id), '') = '' then
    raise exception 'INVALID_STRIPE_EVENT_ID';
  end if;

  if coalesce(trim(p_type), '') = '' then
    raise exception 'INVALID_EVENT_TYPE';
  end if;

  if p_payload is null then
    raise exception 'INVALID_PAYLOAD';
  end if;

  -- Inserta solo si no existe (idempotencia por stripe_event_id)
  insert into public.webhook_events (stripe_event_id, type, payload, received_at)
  values (p_stripe_event_id, p_type, p_payload, now())
  on conflict (stripe_event_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."f_webhooks_log_event"("p_stripe_event_id" "text", "p_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_webhooks_mark_processed"("p_stripe_event_id" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" STRICT SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_rows int;
begin
  if coalesce(trim(p_stripe_event_id), '') = '' then
    raise exception 'INVALID_STRIPE_EVENT_ID';
  end if;

  update public.webhook_events
     set processed_at = coalesce(processed_at, now()),
         order_id     = coalesce(p_order_id, order_id)
   where stripe_event_id = p_stripe_event_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'STRIPE_EVENT_NOT_FOUND';
  end if;
end;
$$;


ALTER FUNCTION "public"."f_webhooks_mark_processed"("p_stripe_event_id" "text", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."f_webinars_resumen"("p_sku" "text", "p_max" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tz text := 'America/Mexico_City';
  v_next record;
  v_future jsonb := '[]'::jsonb;
begin
  if p_sku is null or length(trim(p_sku)) = 0 then
    raise exception 'invalid_sku' using detail = 'p_sku is required';
  end if;

  -- Próxima instancia
  select lci.*
  into v_next
  from public.live_class_instances lci
  where lci.sku = p_sku
    and lci.status in ('scheduled','open')
    and lci.start_at is not null
    and lci.start_at >= now()
  order by lci.start_at asc
  limit 1;

  -- Futura(s) instancias (hasta p_max)
  with q as (
    select
      lci.id, lci.sku, lci.instance_slug, lci.status, lci.title,
      lci.start_at, lci.end_at, lci.timezone,
      lci.capacity, lci.seats_sold, lci.metadata,
      lci.created_at, lci.updated_at
    from public.live_class_instances lci
    where lci.sku = p_sku
      and lci.status in ('scheduled','open')
      and lci.start_at is not null
      and lci.start_at >= now()
    order by lci.start_at asc
    limit coalesce(p_max, 5)
  )
  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) into v_future
  from q;

  return jsonb_build_object(
    'sku', p_sku,
    'generated_at', now(),
    'timezone', v_tz,
    'next_instance',
      case when v_next is null then null else
        jsonb_build_object(
          'id',            v_next.id,
          'sku',           v_next.sku,
          'instance_slug', v_next.instance_slug,
          'status',        v_next.status,
          'title',         v_next.title,
          'start_at',      v_next.start_at,
          'end_at',        v_next.end_at,
          'timezone',      v_next.timezone,
          'capacity',      v_next.capacity,
          'seats_sold',    v_next.seats_sold,
          'metadata',      v_next.metadata,
          'created_at',    v_next.created_at,
          'updated_at',    v_next.updated_at
        )
      end,
    'future_instances', v_future
  );
end;
$$;


ALTER FUNCTION "public"."f_webinars_resumen"("p_sku" "text", "p_max" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end$$;


ALTER FUNCTION "public"."tg_set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundle_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_sku" "text" NOT NULL,
    "child_sku" "text" NOT NULL,
    "qty" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "bundle_items_qty_check" CHECK (("qty" > 0)),
    CONSTRAINT "ck_bundle_items_no_self" CHECK (("child_sku" <> "bundle_sku"))
);


ALTER TABLE "public"."bundle_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundles" (
    "bundle_sku" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bundles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "public"."citext" NOT NULL,
    "user_id" "uuid",
    "status" "text" NOT NULL,
    "consent_status" "text" NOT NULL,
    "consent_source" "text",
    "consent_at" timestamp with time zone,
    "double_opt_in_at" timestamp with time zone,
    "segment" "text",
    "utm" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tech_metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" "text",
    "brevo_contact_id" "text",
    CONSTRAINT "ck_contacts__consent_source" CHECK ((("consent_source" IS NULL) OR ("consent_source" = ANY (ARRAY['web_form'::"text", 'checkout'::"text", 'import'::"text", 'api'::"text"])))),
    CONSTRAINT "ck_contacts__consent_status" CHECK (("consent_status" = ANY (ARRAY['none'::"text", 'single_opt_in'::"text", 'double_opt_in'::"text"]))),
    CONSTRAINT "ck_contacts__status" CHECK (("status" = ANY (ARRAY['active'::"text", 'unsubscribed'::"text", 'bounced'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entitlement_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entitlement_id" "uuid" NOT NULL,
    "type" "public"."entitlement_event_type" NOT NULL,
    "actor" "text" DEFAULT 'system'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_entitlement_events_type" CHECK (("type" = ANY (ARRAY['grant'::"public"."entitlement_event_type", 'renew'::"public"."entitlement_event_type", 'revoke'::"public"."entitlement_event_type", 'expire'::"public"."entitlement_event_type", 'restore'::"public"."entitlement_event_type"])))
);


ALTER TABLE "public"."entitlement_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "fulfillment_type" "text" NOT NULL,
    "source_type" "public"."entitlement_source_type" NOT NULL,
    "source_id" "text",
    "active" boolean DEFAULT true NOT NULL,
    "valid_until" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "entitlements_fulfillment_type_check" CHECK (("fulfillment_type" = ANY (ARRAY['course'::"text", 'template'::"text", 'live_class'::"text", 'one_to_one'::"text", 'subscription_grant'::"text"])))
);


ALTER TABLE "public"."entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exclusivity_members" (
    "sku" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "set_key" "text" NOT NULL
);


ALTER TABLE "public"."exclusivity_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exclusivity_sets" (
    "name" "text" NOT NULL,
    "rule" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "set_key" "text" NOT NULL,
    CONSTRAINT "ck_exclusivity_sets_set_key_format" CHECK ((("char_length"("set_key") <= 60) AND ("set_key" ~ '^[a-z0-9_-]+$'::"text"))),
    CONSTRAINT "exclusivity_sets_rule_check" CHECK (("rule" = ANY (ARRAY['mutually_exclusive'::"text", 'single_selection'::"text"])))
);


ALTER TABLE "public"."exclusivity_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incompatibilities" (
    "sku_a" "text" NOT NULL,
    "sku_b" "text" NOT NULL,
    CONSTRAINT "ck_incompat_order" CHECK (("sku_a" < "sku_b"))
);


ALTER TABLE "public"."incompatibilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_class_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "instance_slug" "text" NOT NULL,
    "status" "text" NOT NULL,
    "title" "text",
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "timezone" "text" DEFAULT 'America/Mexico_City'::"text" NOT NULL,
    "capacity" integer DEFAULT 10,
    "seats_sold" integer DEFAULT 0 NOT NULL,
    "zoom_join_url" "text",
    "replay_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "brevo_cohort_list_id" bigint,
    CONSTRAINT "ck_live_class_instances_capacity_nonneg" CHECK ((("capacity" IS NULL) OR ("capacity" >= 0))),
    CONSTRAINT "ck_live_class_instances_seats_nonneg" CHECK (("seats_sold" >= 0)),
    CONSTRAINT "ck_live_class_instances_seats_vs_capacity" CHECK ((("capacity" IS NULL) OR ("seats_sold" <= "capacity"))),
    CONSTRAINT "ck_live_class_instances_slug_pattern" CHECK (("instance_slug" ~ '^\d{4}-\d{2}-\d{2}-\d{4}$'::"text")),
    CONSTRAINT "ck_live_class_instances_status" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'open'::"text", 'sold_out'::"text", 'ended'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."live_class_instances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."live_class_instances"."brevo_cohort_list_id" IS 'ID de la lista de cohorte en Brevo. Se usa para asignar el contacto a la lista correcta durante registro.';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "utm" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "processing_status" "text" DEFAULT 'received'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "ck_messages__processing_status" CHECK (("processing_status" = ANY (ARRAY['received'::"text", 'queued'::"text", 'sent_to_crm'::"text", 'discarded'::"text"]))),
    CONSTRAINT "ck_messages__source" CHECK (("source" = ANY (ARRAY['web_form'::"text", 'checkout'::"text", 'import'::"text", 'api'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "doc_type" "text" NOT NULL,
    "provider" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "external_id" "text",
    "url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "order_documents_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['invoice'::"text", 'ticket'::"text", 'receipt'::"text", 'credit_note'::"text"])))
);


ALTER TABLE "public"."order_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "actor" "text" DEFAULT 'system'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "ck_order_events_type" CHECK (("type" = ANY (ARRAY['created'::"text", 'paid'::"text", 'fulfilled'::"text", 'scheduled'::"text", 'refunded'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."order_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_headers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" NOT NULL,
    "stripe_session_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_invoice_id" "text",
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "fulfillment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invoice_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "order_number" "text" NOT NULL,
    "receipt_sent_at" timestamp with time zone,
    "receipt_provider_id" "text",
    CONSTRAINT "ck_order_headers_order_number_format" CHECK (("order_number" ~ '^ORD-\d{6}$'::"text")),
    CONSTRAINT "order_headers_fulfillment_status_check" CHECK (("fulfillment_status" = ANY (ARRAY['pending'::"text", 'fulfilled'::"text", 'revoked'::"text"]))),
    CONSTRAINT "order_headers_invoice_status_check" CHECK (("invoice_status" = ANY (ARRAY['none'::"text", 'invoiced'::"text", 'credit_issued'::"text"]))),
    CONSTRAINT "order_headers_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'refunded'::"text", 'canceled'::"text", 'unpaid'::"text"])))
);


ALTER TABLE "public"."order_headers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "line_number" integer NOT NULL,
    CONSTRAINT "ck_order_items_line_number_pos" CHECK (("line_number" > 0)),
    CONSTRAINT "order_items_product_type_check" CHECK (("product_type" = ANY (ARRAY['course'::"text", 'template'::"text", 'live_class'::"text", 'one_to_one'::"text", 'subscription_grant'::"text", 'bundle'::"text"]))),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "total_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" NOT NULL,
    "stripe_invoice_id" "text",
    "stripe_payment_intent_id" "text",
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "stripe_charge_id" "text",
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "payments_currency_check" CHECK (("currency" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'refunded'::"text", 'failed'::"text", 'canceled'::"text"]))),
    CONSTRAINT "payments_total_cents_check" CHECK (("total_cents" >= 0))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" NOT NULL,
    "price_list" "text" DEFAULT 'default'::"text" NOT NULL,
    "interval" "text" DEFAULT 'one_time'::"text" NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "stripe_price_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "ck_product_prices_amount_positive" CHECK (("amount_cents" > 0)),
    CONSTRAINT "ck_product_prices_currency" CHECK (("currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"]))),
    CONSTRAINT "ck_product_prices_list" CHECK (("price_list" = ANY (ARRAY['default'::"text", 'launch'::"text"]))),
    CONSTRAINT "ck_product_prices_valid_window" CHECK ((("valid_until" IS NULL) OR ("valid_from" IS NULL) OR ("valid_until" > "valid_from"))),
    CONSTRAINT "product_prices_interval_check" CHECK (("interval" = ANY (ARRAY['one_time'::"text", 'month'::"text", 'year'::"text"])))
);


ALTER TABLE "public"."product_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" NOT NULL,
    "visibility" "text" DEFAULT 'public'::"text" NOT NULL,
    "product_type" "text" NOT NULL,
    "fulfillment_type" "text" NOT NULL,
    "is_subscription" boolean DEFAULT false NOT NULL,
    "stripe_product_id" "text",
    "tax_code" "text",
    "allow_discounts" boolean DEFAULT true NOT NULL,
    "commissionable" boolean DEFAULT false NOT NULL,
    "commission_rate_pct" numeric(5,2),
    "inventory_qty" integer,
    "weight_grams" integer,
    "available_from" timestamp with time zone,
    "available_until" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "page_slug" "text",
    CONSTRAINT "ck_products_sku_format" CHECK (("sku" ~ '^[a-z0-9-]+-v[0-9]{3}$'::"text")),
    CONSTRAINT "ck_products_visibility" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'hidden'::"text"]))),
    CONSTRAINT "products_fulfillment_type_check" CHECK (("fulfillment_type" = ANY (ARRAY['course'::"text", 'template'::"text", 'live_class'::"text", 'one_to_one'::"text", 'subscription_grant'::"text", 'bundle'::"text", 'free_class'::"text"]))),
    CONSTRAINT "products_product_type_check" CHECK (("product_type" = ANY (ARRAY['digital'::"text", 'physical'::"text", 'service'::"text", 'subscription_grant'::"text"]))),
    CONSTRAINT "products_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'active'::"text", 'sunsetting'::"text", 'discontinued'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."page_slug" IS 'Slug o ruta perenne de la landing del producto. Único cuando no es NULL.';



CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "scope" "text" NOT NULL,
    "type" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "window_started_at" timestamp with time zone NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rate_limits_bucket_check" CHECK (("bucket" = ANY (ARRAY['burst'::"text", 'sustained'::"text"])))
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."seq_order_headers_order_number"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."seq_order_headers_order_number" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "source" "text" NOT NULL,
    "reason" "text",
    "campaign_id" "text",
    "idempotency_key" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    CONSTRAINT "ck_subscription_events__event_type" CHECK (("event_type" = ANY (ARRAY['opt_in'::"text", 'double_opt_in'::"text", 'unsubscribe'::"text", 'bounce'::"text", 'complaint'::"text"]))),
    CONSTRAINT "ck_subscription_events__source" CHECK (("source" = ANY (ARRAY['web_form'::"text", 'checkout'::"text", 'import'::"text", 'api'::"text", 'provider_webhook'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thankyou_copy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "locale" "text" NOT NULL,
    "country" "text",
    "title" "text" NOT NULL,
    "body_md" "text" NOT NULL,
    "cta_label" "text" NOT NULL,
    "cta_slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "thankyou_copy_country_chk" CHECK ((("country" IS NULL) OR (("char_length"("country") = 2) AND ("country" = "upper"("country"))))),
    CONSTRAINT "thankyou_copy_cta_slug_no_spaces" CHECK (("cta_slug" !~ '\s'::"text")),
    CONSTRAINT "thankyou_copy_cta_slug_no_url" CHECK (("cta_slug" !~* 'https?://'::"text"))
);


ALTER TABLE "public"."thankyou_copy" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_entitlements_active" WITH ("security_invoker"='true') AS
 SELECT "id",
    "user_id",
    "sku",
    "fulfillment_type",
    "source_type",
    "source_id",
    "active",
    "valid_until",
    "revoked_at",
    "metadata",
    "created_at",
    "updated_at"
   FROM "public"."entitlements" "e"
  WHERE (("active" IS TRUE) AND ("revoked_at" IS NULL) AND (("valid_until" IS NULL) OR ("valid_until" > "now"())));


ALTER VIEW "public"."v_entitlements_active" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_orders_with_payments" WITH ("security_invoker"='true') AS
 WITH "agg" AS (
         SELECT "payments"."order_id",
            ("count"(*))::integer AS "payments_count",
            (COALESCE("sum"(
                CASE
                    WHEN ("payments"."status" = 'paid'::"text") THEN "payments"."total_cents"
                    ELSE 0
                END), (0)::bigint))::integer AS "total_paid_cents"
           FROM "public"."payments"
          GROUP BY "payments"."order_id"
        ), "last_paid" AS (
         SELECT DISTINCT ON ("payments"."order_id") "payments"."order_id",
            "payments"."id" AS "last_payment_id",
            "payments"."created_at" AS "last_paid_at"
           FROM "public"."payments"
          WHERE ("payments"."status" = 'paid'::"text")
          ORDER BY "payments"."order_id", "payments"."created_at" DESC
        )
 SELECT "oh"."id" AS "order_id",
    "oh"."user_id",
    "oh"."order_number",
    "oh"."total_cents" AS "order_total_cents",
    "lower"("oh"."currency") AS "currency",
    "oh"."status" AS "order_status",
    "oh"."fulfillment_status",
    "oh"."invoice_status",
    "oh"."created_at" AS "order_created_at",
    "oh"."stripe_session_id",
    "oh"."stripe_payment_intent_id",
    "oh"."stripe_invoice_id",
    "oh"."stripe_subscription_id",
    "oh"."stripe_customer_id",
    COALESCE("agg"."payments_count", 0) AS "payments_count",
    COALESCE("agg"."total_paid_cents", 0) AS "total_paid_cents",
    (COALESCE("agg"."total_paid_cents", 0) >= "oh"."total_cents") AS "is_paid",
    ("oh"."total_cents" - COALESCE("agg"."total_paid_cents", 0)) AS "balance_cents",
    "last_paid"."last_paid_at",
    "last_paid"."last_payment_id"
   FROM (("public"."order_headers" "oh"
     LEFT JOIN "agg" ON (("agg"."order_id" = "oh"."id")))
     LEFT JOIN "last_paid" ON (("last_paid"."order_id" = "oh"."id")));


ALTER VIEW "public"."v_orders_with_payments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_prices_vigente" WITH ("security_invoker"='true') AS
 SELECT "id",
    "sku",
    "amount_cents",
    "currency",
    "price_list",
    "interval",
    "valid_from",
    "valid_until",
    "active",
    "stripe_price_id",
    "metadata",
    "created_at",
    "updated_at"
   FROM "public"."product_prices" "pp"
  WHERE (("active" = true) AND (("valid_from" IS NULL) OR ("valid_from" <= "now"())) AND (("valid_until" IS NULL) OR ("now"() < "valid_until")));


ALTER VIEW "public"."v_prices_vigente" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_products_public" WITH ("security_invoker"='true') AS
 WITH "ranked" AS (
         SELECT "vpa"."id",
            "vpa"."sku",
            "vpa"."currency",
            "vpa"."price_list",
            "vpa"."interval",
            "vpa"."amount_cents",
            "vpa"."valid_from",
            "vpa"."valid_until",
            "vpa"."active",
            "vpa"."stripe_price_id",
            "vpa"."metadata",
            "vpa"."created_at",
            "vpa"."updated_at",
            "row_number"() OVER (PARTITION BY "vpa"."sku", "vpa"."currency", "vpa"."interval" ORDER BY
                CASE "vpa"."price_list"
                    WHEN 'launch'::"text" THEN 1
                    WHEN 'default'::"text" THEN 2
                    ELSE 99
                END, "vpa"."created_at" DESC) AS "rn"
           FROM "public"."v_prices_vigente" "vpa"
        ), "best_mxn" AS (
         SELECT "r"."sku",
            "r"."amount_cents" AS "price_mxn_cents",
            "r"."interval" AS "price_mxn_interval",
            "r"."stripe_price_id" AS "price_mxn_stripe_price_id"
           FROM "ranked" "r"
          WHERE (("r"."currency" = 'MXN'::"text") AND ("r"."rn" = 1))
        ), "best_usd" AS (
         SELECT "r"."sku",
            "r"."amount_cents" AS "price_usd_cents",
            "r"."interval" AS "price_usd_interval",
            "r"."stripe_price_id" AS "price_usd_stripe_price_id"
           FROM "ranked" "r"
          WHERE (("r"."currency" = 'USD'::"text") AND ("r"."rn" = 1))
        )
 SELECT "p"."sku",
    "p"."product_type",
    "p"."name",
    "p"."description",
    "p"."status",
    "p"."visibility",
    "p"."metadata",
    "p"."created_at",
    "p"."updated_at",
    "mx"."price_mxn_cents",
    "mx"."price_mxn_interval",
    "mx"."price_mxn_stripe_price_id",
    "us"."price_usd_cents",
    "us"."price_usd_interval",
    "us"."price_usd_stripe_price_id"
   FROM (("public"."products" "p"
     LEFT JOIN "best_mxn" "mx" ON (("mx"."sku" = "p"."sku")))
     LEFT JOIN "best_usd" "us" ON (("us"."sku" = "p"."sku")))
  WHERE (("p"."status" = 'active'::"text") AND ("p"."visibility" = 'public'::"text"));


ALTER VIEW "public"."v_products_public" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_bounced" AS
 SELECT "id",
    "email",
    "status",
    "brevo_contact_id",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") AS "last_status",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_sync_at'::"text") AS "last_sync_at",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_error_code'::"text") AS "last_error_code"
   FROM "public"."contacts" "c"
  WHERE ("status" = 'bounced'::"text");


ALTER VIEW "public"."vista_bounced" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_freeclass_cohortes" AS
 SELECT "c"."id" AS "contact_id",
    "c"."email",
    ("fc"."value" ->> 'class_sku'::"text") AS "class_sku",
    ("fc"."value" ->> 'instance_slug'::"text") AS "instance_slug",
    ("fc"."value" ->> 'status'::"text") AS "status",
    (("fc"."value" ->> 'ts'::"text"))::timestamp with time zone AS "ts"
   FROM "public"."contacts" "c",
    LATERAL "jsonb_array_elements"(COALESCE(("c"."metadata" -> 'free_class_registrations'::"text"), '[]'::"jsonb")) "fc"("value");


ALTER VIEW "public"."vista_freeclass_cohortes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_never_synced" AS
 SELECT "id",
    "email",
    "status",
    "brevo_contact_id",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") AS "last_status",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_sync_at'::"text") AS "last_sync_at"
   FROM "public"."contacts" "c"
  WHERE (((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") IS NULL);


ALTER VIEW "public"."vista_never_synced" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_sync_brevo" AS
 SELECT "id",
    "email",
    "status",
    "brevo_contact_id",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") AS "last_status",
    (((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_sync_at'::"text"))::timestamp with time zone AS "last_sync_at",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_error_code'::"text") AS "last_error_code"
   FROM "public"."contacts" "c";


ALTER VIEW "public"."vista_sync_brevo" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vista_sync_error" AS
 SELECT "id",
    "email",
    "status",
    "brevo_contact_id",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") AS "last_status",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_sync_at'::"text") AS "last_sync_at",
    ((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_error_code'::"text") AS "last_error_code"
   FROM "public"."contacts" "c"
  WHERE (((("metadata" -> 'marketing'::"text") -> 'brevo'::"text") ->> 'last_status'::"text") = 'sync_error'::"text");


ALTER VIEW "public"."vista_sync_error" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_pkey" PRIMARY KEY ("bundle_sku");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entitlement_events"
    ADD CONSTRAINT "entitlement_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exclusivity_members"
    ADD CONSTRAINT "exclusivity_members_pkey" PRIMARY KEY ("set_key", "sku");



ALTER TABLE ONLY "public"."exclusivity_sets"
    ADD CONSTRAINT "exclusivity_sets_pkey" PRIMARY KEY ("set_key");



ALTER TABLE ONLY "public"."incompatibilities"
    ADD CONSTRAINT "incompatibilities_pkey" PRIMARY KEY ("sku_a", "sku_b");



ALTER TABLE ONLY "public"."live_class_instances"
    ADD CONSTRAINT "live_class_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_headers"
    ADD CONSTRAINT "order_headers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_headers"
    ADD CONSTRAINT "order_headers_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."products"
    ADD CONSTRAINT "products_page_slug_format_chk" CHECK ((("page_slug" IS NULL) OR ("page_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'::"text"))) NOT VALID;



COMMENT ON CONSTRAINT "products_page_slug_format_chk" ON "public"."products" IS 'Formato permitido: kebab-case y rutas con "/" en segmentos.';



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("sku");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("scope", "type", "bucket", "key_hash", "window_started_at");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."thankyou_copy"
    ADD CONSTRAINT "thankyou_copy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "ux_contacts__email" UNIQUE ("email");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



CREATE INDEX "idx_contacts__consent_status" ON "public"."contacts" USING "btree" ("consent_status");



CREATE INDEX "idx_contacts__created_at" ON "public"."contacts" USING "btree" ("created_at");



CREATE INDEX "idx_contacts__status" ON "public"."contacts" USING "btree" ("status");



CREATE INDEX "idx_contacts__user_id" ON "public"."contacts" USING "btree" ("user_id");



CREATE INDEX "idx_entitlement_events_created_at" ON "public"."entitlement_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_entitlement_events_entitlement_id" ON "public"."entitlement_events" USING "btree" ("entitlement_id");



CREATE INDEX "idx_entitlements_active" ON "public"."entitlements" USING "btree" ("active");



CREATE INDEX "idx_entitlements_sku" ON "public"."entitlements" USING "btree" ("sku");



CREATE INDEX "idx_entitlements_sku_active" ON "public"."entitlements" USING "btree" ("sku", "active");



CREATE INDEX "idx_entitlements_user_active" ON "public"."entitlements" USING "btree" ("user_id", "active");



CREATE INDEX "idx_entitlements_user_id" ON "public"."entitlements" USING "btree" ("user_id");



CREATE INDEX "idx_entitlements_valid_until" ON "public"."entitlements" USING "btree" ("valid_until");



CREATE INDEX "idx_live_class_instances__sku_start_at_desc" ON "public"."live_class_instances" USING "btree" ("sku", "start_at" DESC);



CREATE INDEX "idx_live_class_instances__status" ON "public"."live_class_instances" USING "btree" ("status");



CREATE INDEX "idx_messages__contact_id" ON "public"."messages" USING "btree" ("contact_id");



CREATE INDEX "idx_messages__created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages__processing_status" ON "public"."messages" USING "btree" ("processing_status");



CREATE INDEX "idx_messages__source" ON "public"."messages" USING "btree" ("source");



CREATE INDEX "idx_order_documents_order_id" ON "public"."order_documents" USING "btree" ("order_id");



CREATE INDEX "idx_order_documents_type" ON "public"."order_documents" USING "btree" ("doc_type");



CREATE INDEX "idx_order_events_order_id" ON "public"."order_events" USING "btree" ("order_id");



CREATE INDEX "idx_order_events_type" ON "public"."order_events" USING "btree" ("type");



CREATE INDEX "idx_order_headers_created_at" ON "public"."order_headers" USING "btree" ("created_at");



CREATE INDEX "idx_order_headers_fulfillment_status" ON "public"."order_headers" USING "btree" ("fulfillment_status");



CREATE INDEX "idx_order_headers_invoice_status" ON "public"."order_headers" USING "btree" ("invoice_status");



CREATE INDEX "idx_order_headers_status" ON "public"."order_headers" USING "btree" ("status");



CREATE INDEX "idx_order_headers_user_created_at" ON "public"."order_headers" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_order_headers_user_id" ON "public"."order_headers" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_sku" ON "public"."order_items" USING "btree" ("sku");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_spi" ON "public"."payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_payments_subscription_id" ON "public"."payments" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_payments_user_id" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "idx_pp_rank_helper" ON "public"."product_prices" USING "btree" ("sku", "currency", "interval", "price_list", "created_at" DESC) WHERE ("active" = true);



CREATE INDEX "idx_product_prices_active" ON "public"."product_prices" USING "btree" ("active") WHERE ("active" = true);



CREATE INDEX "idx_product_prices_currency" ON "public"."product_prices" USING "btree" ("currency");



CREATE INDEX "idx_product_prices_list" ON "public"."product_prices" USING "btree" ("price_list");



CREATE INDEX "idx_product_prices_sku" ON "public"."product_prices" USING "btree" ("sku");



CREATE INDEX "idx_product_prices_sku_active" ON "public"."product_prices" USING "btree" ("sku") WHERE ("active" = true);



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_products_visibility" ON "public"."products" USING "btree" ("visibility");



CREATE INDEX "idx_subscription_events__contact_id" ON "public"."subscription_events" USING "btree" ("contact_id");



CREATE INDEX "idx_subscription_events__event_type" ON "public"."subscription_events" USING "btree" ("event_type");



CREATE INDEX "idx_subscription_events__occurred_at" ON "public"."subscription_events" USING "btree" ("occurred_at");



CREATE INDEX "idx_webhook_events_order_id" ON "public"."webhook_events" USING "btree" ("order_id");



CREATE INDEX "idx_webhook_events_received_at" ON "public"."webhook_events" USING "btree" ("received_at");



CREATE INDEX "ix_thankyou_copy_locale" ON "public"."thankyou_copy" USING "btree" ("locale");



CREATE INDEX "ix_thankyou_copy_sku" ON "public"."thankyou_copy" USING "btree" ("sku");



CREATE INDEX "rate_limits_updated_at_idx" ON "public"."rate_limits" USING "btree" ("updated_at");



CREATE UNIQUE INDEX "ux_bundle_items_pair" ON "public"."bundle_items" USING "btree" ("bundle_sku", "child_sku");



CREATE UNIQUE INDEX "ux_entitlements_active_one" ON "public"."entitlements" USING "btree" ("user_id", "sku") WHERE ("active" IS TRUE);



CREATE UNIQUE INDEX "ux_entitlements_idem" ON "public"."entitlements" USING "btree" ("user_id", "sku", "source_type", "source_id");



CREATE UNIQUE INDEX "ux_entitlements_user_sku_active" ON "public"."entitlements" USING "btree" ("user_id", "sku") WHERE ("active" = true);



CREATE UNIQUE INDEX "ux_live_class_instances__sku_slug" ON "public"."live_class_instances" USING "btree" ("sku", "instance_slug");



CREATE UNIQUE INDEX "ux_messages_contact_request" ON "public"."messages" USING "btree" ("contact_id", (("metadata" ->> 'request_id'::"text"))) WHERE (("metadata" ->> 'request_id'::"text") IS NOT NULL);



CREATE UNIQUE INDEX "ux_order_headers_invoice" ON "public"."order_headers" USING "btree" ("stripe_invoice_id") WHERE ("stripe_invoice_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_order_headers_order_number" ON "public"."order_headers" USING "btree" ("order_number");



CREATE UNIQUE INDEX "ux_order_headers_payment_intent" ON "public"."order_headers" USING "btree" ("stripe_payment_intent_id") WHERE ("stripe_payment_intent_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_order_headers_stripe_subscription_id" ON "public"."order_headers" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_order_items_order_line" ON "public"."order_items" USING "btree" ("order_id", "line_number");



CREATE UNIQUE INDEX "ux_payments_invoice_id" ON "public"."payments" USING "btree" ("stripe_invoice_id") WHERE ("stripe_invoice_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_payments_payment_intent_id" ON "public"."payments" USING "btree" ("stripe_payment_intent_id") WHERE ("stripe_payment_intent_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_product_prices_sku_cur_list_interval" ON "public"."product_prices" USING "btree" ("sku", "currency", "price_list", "interval");



CREATE UNIQUE INDEX "ux_product_prices_stripe" ON "public"."product_prices" USING "btree" ("stripe_price_id") WHERE ("stripe_price_id" IS NOT NULL);



CREATE UNIQUE INDEX "ux_products_page_slug" ON "public"."products" USING "btree" ("page_slug") WHERE ("page_slug" IS NOT NULL);



CREATE UNIQUE INDEX "ux_subscription_events_idem" ON "public"."subscription_events" USING "btree" ("idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "ux_thankyou_copy_sku_locale_country" ON "public"."thankyou_copy" USING "btree" ("sku", "locale", COALESCE("country", '*'::"text"));



CREATE OR REPLACE TRIGGER "trg_bundle_items_updated_at" BEFORE UPDATE ON "public"."bundle_items" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_bundles_updated_at" BEFORE UPDATE ON "public"."bundles" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contacts__touch_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_updated_at_only_update"();



CREATE OR REPLACE TRIGGER "trg_contacts__updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "app"."f_audit_updated_at_only_update_v1"();



CREATE OR REPLACE TRIGGER "trg_entitlement_events_updated_at" BEFORE UPDATE ON "public"."entitlement_events" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entitlements_updated_at" BEFORE UPDATE ON "public"."entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_exclusivity_members_updated_at" BEFORE UPDATE ON "public"."exclusivity_members" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_exclusivity_sets_updated_at" BEFORE UPDATE ON "public"."exclusivity_sets" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_live_class_instances__updated_at" BEFORE UPDATE ON "public"."live_class_instances" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_messages__touch_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_updated_at_only_update"();



CREATE OR REPLACE TRIGGER "trg_messages__updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "app"."f_audit_updated_at_only_update_v1"();



CREATE OR REPLACE TRIGGER "trg_order_documents_updated_at" BEFORE UPDATE ON "public"."order_documents" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_events_updated_at" BEFORE UPDATE ON "public"."order_events" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_headers_updated_at" BEFORE UPDATE ON "public"."order_headers" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_items_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_product_prices_updated_at" BEFORE UPDATE ON "public"."product_prices" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subscription_events__block_ud" BEFORE DELETE OR UPDATE ON "public"."subscription_events" FOR EACH ROW EXECUTE FUNCTION "public"."f_block_update_delete"();



CREATE OR REPLACE TRIGGER "trg_subscription_events__touch_updated_at" BEFORE UPDATE ON "public"."subscription_events" FOR EACH ROW EXECUTE FUNCTION "public"."f_audit_updated_at_only_update"();



CREATE OR REPLACE TRIGGER "trg_subscription_events__updated_at" BEFORE UPDATE ON "public"."subscription_events" FOR EACH ROW EXECUTE FUNCTION "app"."f_audit_updated_at_only_update_v1"();



CREATE OR REPLACE TRIGGER "trg_thankyou_copy_updated_at" BEFORE UPDATE ON "public"."thankyou_copy" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_updated_at"();



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_bundle_sku_fkey" FOREIGN KEY ("bundle_sku") REFERENCES "public"."bundles"("bundle_sku") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_child_sku_fkey" FOREIGN KEY ("child_sku") REFERENCES "public"."products"("sku") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundles"
    ADD CONSTRAINT "bundles_bundle_sku_fkey" FOREIGN KEY ("bundle_sku") REFERENCES "public"."products"("sku") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entitlement_events"
    ADD CONSTRAINT "entitlement_events_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entitlements"
    ADD CONSTRAINT "entitlements_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exclusivity_members"
    ADD CONSTRAINT "exclusivity_members_set_key_fkey" FOREIGN KEY ("set_key") REFERENCES "public"."exclusivity_sets"("set_key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exclusivity_members"
    ADD CONSTRAINT "exclusivity_members_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "fk_contacts__user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "fk_messages__contact" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "fk_subscription_events__contact" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incompatibilities"
    ADD CONSTRAINT "incompatibilities_sku_a_fkey" FOREIGN KEY ("sku_a") REFERENCES "public"."products"("sku");



ALTER TABLE ONLY "public"."incompatibilities"
    ADD CONSTRAINT "incompatibilities_sku_b_fkey" FOREIGN KEY ("sku_b") REFERENCES "public"."products"("sku");



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."order_headers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_documents"
    ADD CONSTRAINT "order_documents_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."order_headers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."order_headers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thankyou_copy"
    ADD CONSTRAINT "thankyou_copy_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."bundle_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundle_items_all_service_role" ON "public"."bundle_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "bundle_items_select_public" ON "public"."bundle_items" FOR SELECT TO "anon", "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."bundles" "b"
     JOIN "public"."products" "p" ON (("p"."sku" = "b"."bundle_sku")))
  WHERE (("b"."bundle_sku" = "bundle_items"."bundle_sku") AND ("p"."visibility" = 'public'::"text") AND ("p"."status" = 'active'::"text")))));



ALTER TABLE "public"."bundles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundles_all_service_role" ON "public"."bundles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "bundles_select_public" ON "public"."bundles" FOR SELECT TO "anon", "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."sku" = "bundles"."bundle_sku") AND ("p"."visibility" = 'public'::"text") AND ("p"."status" = 'active'::"text")))));



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_all_service_role" ON "public"."contacts" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."entitlement_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entitlement_events_select_owner" ON "public"."entitlement_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."entitlements" "e"
  WHERE (("e"."id" = "entitlement_events"."entitlement_id") AND ("e"."user_id" = "public"."current_user_id"())))));



ALTER TABLE "public"."entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entitlements_select_owner" ON "public"."entitlements" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_user_id"()));



CREATE POLICY "entitlements_write_service_role" ON "public"."entitlements" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."exclusivity_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exclusivity_members_all_service_role" ON "public"."exclusivity_members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "exclusivity_members_none_auth" ON "public"."exclusivity_members" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."exclusivity_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exclusivity_sets_all_service_role" ON "public"."exclusivity_sets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "exclusivity_sets_none_auth" ON "public"."exclusivity_sets" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."incompatibilities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incompatibilities_all_service_role" ON "public"."incompatibilities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "incompatibilities_none_auth" ON "public"."incompatibilities" FOR SELECT TO "authenticated" USING (false);



ALTER TABLE "public"."live_class_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_all_service_role" ON "public"."messages" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."order_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_documents_select_owner" ON "public"."order_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_headers" "h"
  WHERE (("h"."id" = "order_documents"."order_id") AND ("h"."user_id" = "public"."current_user_id"())))));



CREATE POLICY "order_documents_write_service_role" ON "public"."order_documents" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."order_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_events_select_owner" ON "public"."order_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_headers" "h"
  WHERE (("h"."id" = "order_events"."order_id") AND ("h"."user_id" = "public"."current_user_id"())))));



CREATE POLICY "order_events_write_service_role" ON "public"."order_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."order_headers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_headers_select_owner" ON "public"."order_headers" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_user_id"()));



CREATE POLICY "order_headers_write_service_role" ON "public"."order_headers" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select_owner" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."order_headers" "h"
  WHERE (("h"."id" = "order_items"."order_id") AND ("h"."user_id" = "public"."current_user_id"())))));



CREATE POLICY "order_items_write_service_role" ON "public"."order_items" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select_owner" ON "public"."payments" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_user_id"()));



CREATE POLICY "payments_write_service_role" ON "public"."payments" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."product_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_prices_all_service_role" ON "public"."product_prices" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "product_prices_select_public_active" ON "public"."product_prices" FOR SELECT TO "anon", "authenticated" USING (("active" = true));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_all_service_role" ON "public"."products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT TO "anon", "authenticated" USING (true);



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rls_live_class_instances__service_full" ON "public"."live_class_instances" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_events_insert_sr" ON "public"."subscription_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "subscription_events_select_sr" ON "public"."subscription_events" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."thankyou_copy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thankyou_copy_select_public" ON "public"."thankyou_copy" FOR SELECT USING (true);



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_events_all_service_role" ON "public"."webhook_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "webhook_events_select_none" ON "public"."webhook_events" FOR SELECT TO "anon", "authenticated" USING (false);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "app" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";



REVOKE ALL ON FUNCTION "app"."f_contacts_free_class_upsert_v1"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."f_contacts_free_class_upsert_v1"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."f_audit_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."f_audit_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_audit_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."f_audit_updated_at_only_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."f_audit_updated_at_only_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_audit_updated_at_only_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_auth_get_user"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_auth_get_user"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_block_update_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."f_block_update_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_block_update_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_bundle_children_next_start"("bundle_sku" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_bundle_next_start_at"("bundle_sku" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_bundle_schedule"("bundle_sku" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_bundles_expand_items"("p_bundle_sku" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_bundles_expand_items"("p_bundle_sku" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_catalog_price_by_sku"("p_sku" "text", "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_catalog_price_by_sku"("p_sku" "text", "p_currency" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text", "p_price_list" "text", "p_use_validity" boolean, "p_allow_fallback" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text", "p_price_list" "text", "p_use_validity" boolean, "p_allow_fallback" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text", "p_price_list" "text", "p_use_validity" boolean, "p_allow_fallback" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_checkout_mapping"("p_sku" "text", "p_currency" "text", "p_price_list" "text", "p_use_validity" boolean, "p_allow_fallback" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."f_contacts_free_class_upsert"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."f_contacts_free_class_upsert"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_contacts_free_class_upsert"("p_contact_id" "uuid", "p_class_sku" "text", "p_instance_slug" "text", "p_status" "text", "p_ts" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."f_contacts_marketing_update_v1"("p_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_contacts_marketing_update_v1"("p_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_contacts_marketing_update_v1"("p_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_debug_get_entitlements_by_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."f_debug_get_entitlements_by_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_debug_get_entitlements_by_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_debug_get_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."f_debug_get_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_debug_get_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_debug_get_payments_by_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."f_debug_get_payments_by_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_debug_get_payments_by_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_debug_orders_parse_payment_from_payload"("session_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_debug_orders_parse_payment_from_payload"("session_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_debug_orders_parse_payment_from_payload"("session_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_debug_orders_payment_both"("session_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_debug_orders_payment_both"("session_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_debug_orders_payment_both"("session_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_entitlement_has_email"("p_email" "text", "p_sku" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_entitlements_apply"("p_user_id" "uuid", "p_order_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_entitlements_apply"("p_user_id" "uuid", "p_order_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_entitlements_grant"("p_user_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_source_type" "text", "p_source_id" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_entitlements_grant"("p_user_id" "uuid", "p_sku" "text", "p_fulfillment_type" "text", "p_source_type" "text", "p_source_id" "text", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_entitlements_renew_subscription"("p_entitlement_id" "uuid", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text", "p_was_existing" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_entitlements_renew_subscription"("p_entitlement_id" "uuid", "p_metadata" "jsonb", "p_valid_until" timestamp with time zone, "p_actor" "text", "p_was_existing" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_orch_contact_write"("p_input" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."f_orch_contact_write_v1"("p_input" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orch_contact_write_v1"("p_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_orch_contact_write_v2"("p_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_orch_contact_write_v2"("p_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_orch_contact_write_v2"("p_input" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orch_orders_upsert"("session_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orch_orders_upsert"("session_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_order_headers_upsert"("p_user_id" "uuid", "p_total_cents" integer, "p_currency" "text", "p_status" "text", "p_stripe_session_id" "text", "p_stripe_invoice_id" "text", "p_stripe_subscription_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_order_headers_upsert"("p_user_id" "uuid", "p_total_cents" integer, "p_currency" "text", "p_status" "text", "p_stripe_session_id" "text", "p_stripe_invoice_id" "text", "p_stripe_subscription_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orders_new_order_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orders_new_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."f_orders_parse_keys"("p_obj" "jsonb", "p_event_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."f_orders_parse_keys"("p_obj" "jsonb", "p_event_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_orders_parse_keys"("p_obj" "jsonb", "p_event_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orders_parse_metadata"("p_obj" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orders_parse_metadata"("p_obj" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orders_parse_payment"("p_obj" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orders_parse_payment"("p_obj" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_orders_resolve_user"("p_obj" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_orders_resolve_user"("p_obj" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_payments_upsert"("p_user_id" "uuid", "p_obj" "jsonb", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."f_payments_upsert"("p_user_id" "uuid", "p_obj" "jsonb", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_payments_upsert"("p_user_id" "uuid", "p_obj" "jsonb", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_payments_upsert_by_session"("p_payment_intent" "jsonb", "p_session" "jsonb", "p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."f_payments_upsert_by_session"("p_payment_intent" "jsonb", "p_session" "jsonb", "p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_payments_upsert_by_session"("p_payment_intent" "jsonb", "p_session" "jsonb", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_rate_limit_touch_v1"("v_input" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_webhookevents_getbystripeid"("p_stripe_event_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_webhookevents_getbystripeid"("p_stripe_event_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_webhooks_log_event"("p_stripe_event_id" "text", "p_type" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_webhooks_log_event"("p_stripe_event_id" "text", "p_type" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."f_webhooks_mark_processed"("p_stripe_event_id" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."f_webhooks_mark_processed"("p_stripe_event_id" "text", "p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."f_webinars_resumen"("p_sku" "text", "p_max" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."f_webinars_resumen"("p_sku" "text", "p_max" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."f_webinars_resumen"("p_sku" "text", "p_max" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."bundle_items" TO "anon";
GRANT ALL ON TABLE "public"."bundle_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_items" TO "service_role";



GRANT ALL ON TABLE "public"."bundles" TO "anon";
GRANT ALL ON TABLE "public"."bundles" TO "authenticated";
GRANT ALL ON TABLE "public"."bundles" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."entitlement_events" TO "anon";
GRANT ALL ON TABLE "public"."entitlement_events" TO "authenticated";
GRANT ALL ON TABLE "public"."entitlement_events" TO "service_role";



GRANT ALL ON TABLE "public"."entitlements" TO "anon";
GRANT ALL ON TABLE "public"."entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."exclusivity_members" TO "anon";
GRANT ALL ON TABLE "public"."exclusivity_members" TO "authenticated";
GRANT ALL ON TABLE "public"."exclusivity_members" TO "service_role";



GRANT ALL ON TABLE "public"."exclusivity_sets" TO "anon";
GRANT ALL ON TABLE "public"."exclusivity_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."exclusivity_sets" TO "service_role";



GRANT ALL ON TABLE "public"."incompatibilities" TO "anon";
GRANT ALL ON TABLE "public"."incompatibilities" TO "authenticated";
GRANT ALL ON TABLE "public"."incompatibilities" TO "service_role";



GRANT ALL ON TABLE "public"."live_class_instances" TO "anon";
GRANT ALL ON TABLE "public"."live_class_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."live_class_instances" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."order_documents" TO "anon";
GRANT ALL ON TABLE "public"."order_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."order_documents" TO "service_role";



GRANT ALL ON TABLE "public"."order_events" TO "anon";
GRANT ALL ON TABLE "public"."order_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_events" TO "service_role";



GRANT ALL ON TABLE "public"."order_headers" TO "anon";
GRANT ALL ON TABLE "public"."order_headers" TO "authenticated";
GRANT ALL ON TABLE "public"."order_headers" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_prices" TO "anon";
GRANT ALL ON TABLE "public"."product_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."product_prices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";
GRANT SELECT ON TABLE "public"."rate_limits" TO "anon";
GRANT SELECT ON TABLE "public"."rate_limits" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."seq_order_headers_order_number" TO "anon";
GRANT ALL ON SEQUENCE "public"."seq_order_headers_order_number" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seq_order_headers_order_number" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."thankyou_copy" TO "anon";
GRANT ALL ON TABLE "public"."thankyou_copy" TO "authenticated";
GRANT ALL ON TABLE "public"."thankyou_copy" TO "service_role";



GRANT ALL ON TABLE "public"."v_entitlements_active" TO "anon";
GRANT ALL ON TABLE "public"."v_entitlements_active" TO "authenticated";
GRANT ALL ON TABLE "public"."v_entitlements_active" TO "service_role";



GRANT ALL ON TABLE "public"."v_orders_with_payments" TO "anon";
GRANT ALL ON TABLE "public"."v_orders_with_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."v_orders_with_payments" TO "service_role";



GRANT ALL ON TABLE "public"."v_prices_vigente" TO "anon";
GRANT ALL ON TABLE "public"."v_prices_vigente" TO "authenticated";
GRANT ALL ON TABLE "public"."v_prices_vigente" TO "service_role";



GRANT ALL ON TABLE "public"."v_products_public" TO "anon";
GRANT ALL ON TABLE "public"."v_products_public" TO "authenticated";
GRANT ALL ON TABLE "public"."v_products_public" TO "service_role";



GRANT ALL ON TABLE "public"."vista_bounced" TO "anon";
GRANT ALL ON TABLE "public"."vista_bounced" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_bounced" TO "service_role";



GRANT ALL ON TABLE "public"."vista_freeclass_cohortes" TO "anon";
GRANT ALL ON TABLE "public"."vista_freeclass_cohortes" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_freeclass_cohortes" TO "service_role";



GRANT ALL ON TABLE "public"."vista_never_synced" TO "anon";
GRANT ALL ON TABLE "public"."vista_never_synced" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_never_synced" TO "service_role";



GRANT ALL ON TABLE "public"."vista_sync_brevo" TO "anon";
GRANT ALL ON TABLE "public"."vista_sync_brevo" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_sync_brevo" TO "service_role";



GRANT ALL ON TABLE "public"."vista_sync_error" TO "anon";
GRANT ALL ON TABLE "public"."vista_sync_error" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_sync_error" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "product_prices_select_public_active" on "public"."product_prices";

drop policy "products_select_public" on "public"."products";

drop policy "webhook_events_select_none" on "public"."webhook_events";

revoke delete on table "public"."rate_limits" from "anon";

revoke insert on table "public"."rate_limits" from "anon";

revoke references on table "public"."rate_limits" from "anon";

revoke trigger on table "public"."rate_limits" from "anon";

revoke truncate on table "public"."rate_limits" from "anon";

revoke update on table "public"."rate_limits" from "anon";

revoke delete on table "public"."rate_limits" from "authenticated";

revoke insert on table "public"."rate_limits" from "authenticated";

revoke references on table "public"."rate_limits" from "authenticated";

revoke trigger on table "public"."rate_limits" from "authenticated";

revoke truncate on table "public"."rate_limits" from "authenticated";

revoke update on table "public"."rate_limits" from "authenticated";


  create policy "product_prices_select_public_active"
  on "public"."product_prices"
  as permissive
  for select
  to authenticated, anon
using ((active = true));



  create policy "products_select_public"
  on "public"."products"
  as permissive
  for select
  to authenticated, anon
using (true);



  create policy "webhook_events_select_none"
  on "public"."webhook_events"
  as permissive
  for select
  to authenticated, anon
using (false);



