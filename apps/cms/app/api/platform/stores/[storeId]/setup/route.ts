import { isSameOrigin } from '@/lib/request-origin';
import { jsonBody,PlatformError,platformResponse,storeMember,platformService,step,audit } from '@/lib/platform/server';
const allowed=new Set(['products','orders','customers','content','discounts','inventory']);
export async function POST(request:Request,{params}:{params:Promise<{storeId:string}>}){
 try{
  if(!isSameOrigin(request))throw new PlatformError('Invalid request origin.',403);
  const {storeId}=await params;const {user}=await storeMember(storeId,true);const body=await jsonBody(request);
  if(body.action==='review'){const {data:steps}=await platformService().from('setup_steps').select('key,status').eq('store_id',storeId);const required=['basics','database','catalog','media','features'];if(!steps||required.some(key=>steps.find(s=>s.key===key)?.status!=='ready'))throw new PlatformError('Complete all setup steps before finishing.');const now=new Date().toISOString();const {error}=await platformService().from('stores').update({status:'ready',setup_completed_at:now,updated_at:now}).eq('id',storeId);if(error)throw new PlatformError('Store could not be marked ready.',503);await audit(storeId,user.id,'setup.completed',{});await step(storeId,'review','ready',{completedAt:now});return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});}
  if(body.action!=='features'||!Array.isArray(body.features)||!body.features.length||body.features.some(f=>typeof f!=='string'||!allowed.has(f)))throw new PlatformError('Choose valid store features.');
  const chosen=new Set(body.features);const {error}=await platformService().from('features').upsert([...allowed].map(key=>({store_id:storeId,key,enabled:chosen.has(key)})));
  if(error)throw new PlatformError('Features could not be saved.',503);
  await audit(storeId,user.id,'setup.features.saved',{features:[...chosen]});
  await step(storeId,'features','ready',{features:[...chosen]});
  return Response.json({success:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return platformResponse(e);}
}
