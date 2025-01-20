-- Add redirect_to column if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 
    from information_schema.columns 
    where table_name = 'signup_verifications' 
    and column_name = 'redirect_to'
  ) then
    alter table public.signup_verifications 
    add column redirect_to text not null default '/';
  end if;
end $$; 