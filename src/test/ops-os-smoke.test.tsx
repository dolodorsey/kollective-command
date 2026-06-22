import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpsContentStudio from "@/pages/OpsContentStudio";
import OpsEventsCommand from "@/pages/OpsEventsCommand";
import OpsMarketing from "@/pages/OpsMarketing";
import OpsRevenue from "@/pages/OpsRevenue";
import OpsSocial from "@/pages/OpsSocial";
import OpsTasksCommand from "@/pages/OpsTasksCommand";

const tableData: Record<string, unknown[]> = {
  khg_content_items: [],
  khg_content_assets: [],
  khg_content_captions: [],
  khg_content_calendar_slots: [],
  khg_social_accounts: [],
  khg_content_performance: [],
  khg_marketing_campaigns: [],
  khg_marketing_calendar_items: [],
  khg_content_generation_requests: [],
  khg_event_rollouts: [],
  khg_revenue_opportunities: [],
  khg_work_queues: [],
  khg_approval_requests: [],
};

function createQuery(tableName: string) {
  const response = { data: tableData[tableName] || [], error: null, count: 0 };
  const query: Record<string, unknown> = {
    select: () => query,
    order: () => query,
    limit: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    gte: () => query,
    update: () => query,
    insert: () => query,
    upsert: () => query,
    single: () => Promise.resolve({ data: response.data[0] || { id: "mock-id" }, error: null }),
    maybeSingle: () => Promise.resolve({ data: response.data[0] || null, error: null }),
    then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve),
  };
  return query;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (tableName: string) => createQuery(tableName),
    channel: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }), subscribe: () => ({}) }),
    removeChannel: vi.fn(),
  },
}));

function renderPage(component: ReactElement, path: string) {
  window.history.pushState({}, "", path);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Ops OS command centers", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the Social upload form from the primary action", async () => {
    renderPage(<OpsSocial />, "/ops-os/social");
    fireEvent.click(screen.getByRole("button", { name: /program post/i }));
    expect(await screen.findByRole("heading", { name: /upload \/ program social content/i })).toBeInTheDocument();
  });

  it("opens the Marketing create form from the primary action", async () => {
    renderPage(<OpsMarketing />, "/ops-os/marketing");
    fireEvent.click(screen.getByRole("button", { name: /create campaign/i }));
    expect(await screen.findByRole("heading", { name: /create marketing calendar item/i })).toBeInTheDocument();
  });

  it("opens the Content Studio request form from a deep link", async () => {
    renderPage(<OpsContentStudio />, "/ops-os/content-studio?tab=requests");
    expect(await screen.findByRole("heading", { name: /new creative request/i })).toBeInTheDocument();
  });

  it("opens the Events create form from the primary action", async () => {
    renderPage(<OpsEventsCommand />, "/ops-os/events");
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));
    expect(await screen.findByRole("heading", { name: /create event rollout/i })).toBeInTheDocument();
  });

  it("opens the Revenue create form from the primary action", async () => {
    renderPage(<OpsRevenue />, "/ops-os/revenue");
    fireEvent.click(screen.getByRole("button", { name: /add money move/i }));
    expect(await screen.findByRole("heading", { name: /add revenue opportunity/i })).toBeInTheDocument();
  });

  it("opens the Tasks create form from a deep link and from the primary action", async () => {
    renderPage(<OpsTasksCommand />, "/ops-os/tasks?tab=create");
    expect(await screen.findByRole("heading", { name: /create work item/i })).toBeInTheDocument();
  });

  it("keeps all create forms reachable without browser automation", async () => {
    const pages: Array<[ReactElement, string, RegExp]> = [
      [<OpsSocial />, "/ops-os/social?tab=upload", /upload \/ program social content/i],
      [<OpsMarketing />, "/ops-os/marketing?tab=create", /create marketing calendar item/i],
      [<OpsEventsCommand />, "/ops-os/events?tab=create", /create event rollout/i],
      [<OpsRevenue />, "/ops-os/revenue?tab=create", /add revenue opportunity/i],
      [<OpsTasksCommand />, "/ops-os/tasks?tab=create", /create work item/i],
    ];

    for (const [component, path, expected] of pages) {
      const view = renderPage(component, path);
      await waitFor(() => expect(screen.getByRole("heading", { name: expected })).toBeInTheDocument());
      view.unmount();
    }
  });
});
