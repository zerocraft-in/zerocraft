// The browser sends only an appointment ID. Contact details stay server-side.
export async function sendWhatsAppViaN8n(appointmentId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/notify-appointment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    const result = await response.json();
    return { success: response.ok, message: result.message || result.error || "Automation could not be triggered." };
  } catch { return { success: false, message: "Automation is temporarily unavailable." }; }
}
