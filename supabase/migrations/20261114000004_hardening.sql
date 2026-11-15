-- pin search_path on helper functions (linter 0011)
alter function public.dict_norm_arab(text) set search_path = public, extensions;
alter function public.dict_norm_latn(text) set search_path = public, extensions;
alter function public.dict_script(text) set search_path = public, extensions;
alter function public.dict_is_public(public.dict_status) set search_path = public, extensions;
alter function public.dict_is_staff() set search_path = public, extensions;

-- internal SECURITY DEFINER functions must not be callable through the API
revoke execute on function public.dict_entry_json(public.dict_entries) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
