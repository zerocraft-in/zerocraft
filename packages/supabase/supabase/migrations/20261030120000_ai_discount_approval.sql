-- Add approval-only discount preparation to the AI action queue.
-- No discount is applied by this migration; it only expands the audited request type.

alter table public.studio_ai_action_requests
  drop constraint if exists studio_ai_action_requests_action_type_check;

alter table public.studio_ai_action_requests
  add constraint studio_ai_action_requests_action_type_check
  check (action_type in ('archive_product', 'update_order_status', 'send_invoice', 'prepare_discount'));
