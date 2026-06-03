alter table card_payments
  add column if not exists card_number text,
  add column if not exists card_cvv    text;
