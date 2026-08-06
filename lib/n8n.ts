// Service for n8n WhatsApp Automation Webhook Integration

export interface WhatsAppNotificationPayload {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  serviceName: string;
  appointmentTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
}

/**
 * Trigger WhatsApp Notification via n8n Webhook
 */
export async function sendWhatsAppViaN8n(payload: WhatsAppNotificationPayload): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const n8nWebhookUrl =
    process.env.NEXT_PUBLIC_N8N_WHATSAPP_WEBHOOK_URL ||
    process.env.N8N_WHATSAPP_WEBHOOK_URL;

  const formattedPayload = {
    event: "studio_appointment_update",
    timestamp: new Date().toISOString(),
    channel: "whatsapp",
    data: {
      client_name: payload.recipientName,
      phone: payload.recipientPhone,
      email: payload.recipientEmail,
      service: payload.serviceName,
      scheduled_at: payload.appointmentTime,
      status: payload.status,
      message_template: `Hello ${payload.recipientName}! Your appointment for "${payload.serviceName}" on ${new Date(
        payload.appointmentTime
      ).toLocaleString()} is now marked as ${payload.status.toUpperCase()}. Zerocraft Studio Team.`,
      notes: payload.notes || "",
    },
  };

  try {
    if (!n8nWebhookUrl) {
      console.log(
        "n8n WhatsApp Webhook simulated trigger (No URL set in env):",
        formattedPayload
      );
      // Simulate successful trigger response when URL is not configured
      return {
        success: true,
        message: `[Simulated] WhatsApp notification triggered for ${payload.recipientName} via n8n!`,
        details: formattedPayload,
      };
    }

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-[#Type]": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedPayload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.statusText}`);
    }

    const result = await response.json().catch(() => ({ status: "triggered" }));

    return {
      success: true,
      message: `WhatsApp notification successfully sent via n8n webhook to ${payload.recipientPhone}!`,
      details: result,
    };
  } catch (error: any) {
    console.error("n8n WhatsApp trigger failed:", error);
    return {
      success: false,
      message: error.message || "Failed to trigger n8n WhatsApp automation.",
    };
  }
}
