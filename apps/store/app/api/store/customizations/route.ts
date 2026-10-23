import { isSameOrigin } from "@/lib/request-origin";
import {
  CUSTOMER_CUSTOMIZATIONS_BUCKET,
  requireCustomerStorageClient,
  safeObjectKey,
  validateStorageFile,
} from "@/lib/storage/server";
import { isUuid } from "@/lib/commerce/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (process.env.ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED !== "true")
    return Response.json(
      { error: "Customization uploads are not enabled yet." },
      { status: 503 },
    );
  let client;
  try {
    client = await requireCustomerStorageClient();
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sign in to upload customization artwork.",
      },
      { status: 401 },
    );
  }
  const form = await request.formData();
  const file = form.get("file");
  const productId = form.get("productId");
  const templateId = form.get("templateId");
  if (
    typeof productId !== "string" ||
    !isUuid(productId) ||
    typeof templateId !== "string" ||
    !isUuid(templateId)
  )
    return Response.json(
      { error: "A valid product and customization template are required." },
      { status: 400 },
    );
  if (!(file instanceof File))
    return Response.json(
      { error: "An artwork file is required." },
      { status: 400 },
    );
  let extension: string;
  try {
    ({ extension } = validateStorageFile(file, CUSTOMER_CUSTOMIZATIONS_BUCKET));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The artwork file is invalid.",
      },
      { status: 400 },
    );
  }
  const storagePath = safeObjectKey(client.user.id, extension);
  const { data: template, error: templateError } = await client.supabase
    .from("store_customization_templates")
    .select("id,product_id,status")
    .eq("id", templateId)
    .eq("product_id", productId)
    .eq("status", "published")
    .maybeSingle();
  if (templateError || !template)
    return Response.json(
      { error: "The customization template is unavailable." },
      { status: 400 },
    );
  const { error: uploadError } = await client.supabase.storage
    .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError)
    return Response.json(
      { error: "The artwork could not be uploaded." },
      { status: 502 },
    );
  const { data: customization, error: customizationError } =
    await client.supabase
      .from("store_customizations")
      .insert({
        customer_id: client.user.id,
        product_id: productId,
        template_id: template.id,
        object_path: storagePath,
        mime_type: file.type,
        byte_size: file.size,
        status: "ready",
      })
      .select("id,object_path")
      .single();
  if (customizationError || !customization) {
    await client.supabase.storage
      .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
      .remove([storagePath]);
    return Response.json(
      { error: "The artwork ownership record could not be created." },
      { status: 502 },
    );
  }
  const { data: signed, error: signedError } = await client.supabase.storage
    .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
    .createSignedUrl(storagePath, 300);
  if (signedError || !signed?.signedUrl) {
    await client.supabase.storage
      .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
      .remove([storagePath]);
    return Response.json(
      { error: "A private artwork preview could not be created." },
      { status: 502 },
    );
  }
  return Response.json(
    {
      customizationId: customization.id,
      objectPath: storagePath,
      signedUrl: signed.signedUrl,
      expiresIn: 300,
    },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
