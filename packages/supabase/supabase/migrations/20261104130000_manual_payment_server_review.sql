-- Platform-bridge staff are authenticated by the CMS server, not by the
-- tenant database. Allow only the server's service role to execute an atomic
-- review RPC after the CMS verifies that the actor is an administrator.
create or replace function public.verify_manual_payment_server(
  p_submission_id uuid,
  p_decision text,
  p_note text,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission record;
  v_status text;
  v_payment_status text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     or p_actor_id is null
     or p_decision not in ('approve', 'reject')
     or length(coalesce(p_note, '')) > 500 then
    raise exception using errcode = '42501', message = 'PAYMENT_FORBIDDEN: trusted administrator required';
  end if;

  select id, order_id, payment_attempt_id, status
    into v_submission
    from public.payment_submissions
    where id = p_submission_id
    for update;
  if not found or v_submission.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: submission is not pending';
  end if;

  v_status := case when p_decision = 'approve' then 'paid' else 'rejected' end;
  v_payment_status := case when p_decision = 'approve' then 'paid' else 'unpaid' end;
  update public.payment_submissions
    set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = p_actor_id, reviewed_at = now(), review_note = coalesce(p_note, '')
    where id = v_submission.id and status = 'pending';
  if not found then
    raise exception using errcode = 'P0001', message = 'PAYMENT_INVALID: submission is not pending';
  end if;
  update public.payment_attempts set status = v_status, updated_at = now()
    where id = v_submission.payment_attempt_id;
  update public.orders set payment_status = v_payment_status, updated_at = now()
    where id = v_submission.order_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor_id,
      case when p_decision = 'approve' then 'manual_payment_approved' else 'manual_payment_rejected' end,
      'store_payment_submission', v_submission.id,
      jsonb_build_object('order_id', v_submission.order_id, 'attempt_id', v_submission.payment_attempt_id));
  return jsonb_build_object('id', v_submission.id, 'status', v_status, 'payment_status', v_payment_status);
end;
$$;

revoke all on function public.verify_manual_payment_server(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.verify_manual_payment_server(uuid, text, text, uuid) to service_role;
notify pgrst, 'reload schema';
