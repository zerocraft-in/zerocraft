/** @vitest-environment jsdom */

import * as React from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("framer-motion", () => {
  const MotionDiv = (props: React.ComponentProps<"div">) => {
    const { children, ...rest } = props;
    return React.createElement("div", rest, children);
  };
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import StoreSetupWizard from "./wizard";

const fetchMock = vi.fn();
const originalFetch = (global as unknown as Record<string, unknown>).fetch;

beforeEach(() => {
  ;(global as unknown as Record<string, unknown>).fetch = fetchMock;
  ;(window as unknown as Record<string, unknown>).fetch = fetchMock;
  fetchMock.mockReset();
  localStorage.clear();
  Object.defineProperty(window, "location", {
    value: {
      ...window.location,
      href: "http://localhost:3000/onboarding/setup?organizationId=org-1",
      search: "?organizationId=org-1",
      origin: "http://localhost:3000",
    },
    writable: true,
    configurable: true,
  });
  history.replaceState(null, "", "?organizationId=org-1");
});

afterEach(() => {
  cleanup();
  ;(global as unknown as Record<string, unknown>).fetch = originalFetch;
  ;(window as unknown as Record<string, unknown>).fetch = originalFetch;
  localStorage.clear();
});

function setWizardDrafts(step: number, connectionId?: string) {
  localStorage.setItem("maara_setup_wizard:step", JSON.stringify(step));
  localStorage.setItem(
    "maara_setup_wizard:store",
    JSON.stringify({ storeName: "Maara Clothing", storeSlug: "maara-clothing", region: "ap-south-1" })
  );
  localStorage.setItem(
    "maara_setup_wizard:business",
    JSON.stringify({
      businessType: "sole_proprietorship",
      country: "IN",
      addressLine1: "123 MG Road",
      city: "Bengaluru",
      postalCode: "560001",
      contactEmail: "you@company.com",
      contactPhone: "+91 98765 43210",
    })
  );
  localStorage.setItem(
    "maara_setup_wizard:shipping",
    JSON.stringify({ shippingOrigin: "123 MG Road, Bengaluru, IN", destinationZones: ["domestic"], deliveryMethods: ["standard"] })
  );
  if (connectionId) {
    localStorage.setItem("maara_setup_wizard:connection", JSON.stringify(connectionId));
  }
}

describe("StoreSetupWizard - OAuth vs provisioner independence", () => {
  it("shows the Connect Supabase button when provisioner is unavailable", async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("/api/onboarding/regions"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, regions: ["ap-south-1"] }) } as unknown as Response);
      if (u.includes("/api/onboarding/connections"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, connections: [] }) } as unknown as Response);
      if (u.includes("/api/onboarding/provisioner-status"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, provisionerConfigured: false }) } as unknown as Response);
      return Promise.resolve({ ok: false, json: async () => ({ ok: false }) } as unknown as Response);
    });

    setWizardDrafts(4);

    render(<StoreSetupWizard />);
    await act(async () => {});

    expect(screen.getByRole("heading", { name: "Database Setup" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Connect Supabase account/i })
    ).toBeDefined();
  });

  it("shows the Connect Supabase button when provisioner is configured", async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("/api/onboarding/regions"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, regions: ["ap-south-1"] }) } as unknown as Response);
      if (u.includes("/api/onboarding/connections"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, connections: [] }) } as unknown as Response);
      if (u.includes("/api/onboarding/provisioner-status"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, provisionerConfigured: true }) } as unknown as Response);
      return Promise.resolve({ ok: false, json: async () => ({ ok: false }) } as unknown as Response);
    });

    setWizardDrafts(4);

    render(<StoreSetupWizard />);
    await act(async () => {});

    expect(screen.getByRole("heading", { name: "Database Setup" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Connect Supabase account/i })
    ).toBeDefined();
  });

  it("blocks provisioning when provisioner is unavailable", async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("/api/onboarding/regions"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, regions: ["ap-south-1"] }) } as unknown as Response);
      if (u.includes("/api/onboarding/connections"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, connections: [{ id: "conn-1", account_name: "Supabase Org", connection_status: "active", supabase_organization_id: "sup-org-1", supabase_organization_slug: "sup-org-1" }] }) } as unknown as Response);
      if (u.includes("/api/onboarding/provisioner-status"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, provisionerConfigured: false }) } as unknown as Response);
      return Promise.resolve({ ok: false, json: async () => ({ ok: false }) } as unknown as Response);
    });

    setWizardDrafts(4, "conn-1");

    render(<StoreSetupWizard />);
    await act(async () => {});

    // Wait for provisioner status to load
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/api/onboarding/provisioner-status")
      );
      return calls.length > 0;
    }, { timeout: 5000 });

    // Allow all microtasks from provisioner-status response to flush
    await act(async () => {});
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(screen.getByRole("heading", { name: "Database Setup" })).toBeDefined();

    const continueButtons = screen.getAllByRole("button", { name: /Continue/i });
    fireEvent.click(continueButtons[continueButtons.length - 1]);

    await act(async () => {});

    const reviewContinueButtons = screen.getAllByRole("button", { name: /Continue/i });
    fireEvent.click(reviewContinueButtons[reviewContinueButtons.length - 1]);

    await waitFor(() =>
      screen.getByText(/Database provisioning is temporarily unavailable/i),
      { timeout: 5000 }
    );

    // The error message surfaced (guard worked) — provisioning was blocked.
    expect(screen.getByText(/Database provisioning is temporarily unavailable/i)).toBeDefined();
  });

  it("does not falsely imply database provisioning success after OAuth", async () => {
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes("/api/onboarding/regions"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, regions: ["ap-south-1"] }) } as unknown as Response);
      if (u.includes("/api/onboarding/connections"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, connections: [{ id: "conn-1", account_name: "Supabase Org", connection_status: "active", supabase_organization_id: "sup-org-1", supabase_organization_slug: "sup-org-1" }] }) } as unknown as Response);
      if (u.includes("/api/onboarding/provisioner-status"))
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, provisionerConfigured: true }) } as unknown as Response);
      return Promise.resolve({ ok: false, json: async () => ({ ok: false }) } as unknown as Response);
    });

    setWizardDrafts(4, "conn-1");

    render(<StoreSetupWizard />);
    await act(async () => {});

    expect(screen.getByRole("heading", { name: "Database Setup" })).toBeDefined();

    const continueButtons = screen.getAllByRole("button", { name: /Continue/i });
    fireEvent.click(continueButtons[continueButtons.length - 1]);

    await waitFor(() => screen.getByRole("heading", { name: "Review" }), { timeout: 5000 });

    expect(screen.getByText("Connection established")).toBeDefined();
    expect(screen.queryByText(/Provisioning status/i)).toBeNull();
    expect(screen.queryByText(/SUCCEEDED/i)).toBeNull();
  });
});
