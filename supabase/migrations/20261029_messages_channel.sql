alter table public.messages
  add column if not exists channel text not null default 'platform'
    check (channel in ('platform', 'sms'));
