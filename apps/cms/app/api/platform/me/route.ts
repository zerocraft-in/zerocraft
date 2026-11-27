import { platformUser,platformResponse } from '@/lib/platform/server';
export async function GET(){try{const {user}=await platformUser();return Response.json({user:{id:user.id,email:user.email}},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return platformResponse(e);}}
