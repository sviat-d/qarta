import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiResponse, Alert, PaginatedResponse } from "@qarta/shared";

/**
 * Alert routes — view and manage pre-dispute alerts.
 */
export async function alertRoutes(app: FastifyInstance) {
  // List alerts for a merchant
  app.get("/", async (_request, reply) => {
    // TODO: Authenticate merchant via API key
    // TODO: Fetch alerts from database with pagination + filters

    const response: PaginatedResponse<Alert> = {
      success: true,
      data: [],
      meta: { total: 0, page: 1, perPage: 20 },
    };

    return reply.send(response);
  });

  // Get alert by ID
  app.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const { id } = request.params;

    // TODO: Fetch alert from database
    return reply.send({
      success: true,
      data: {
        id,
        status: "new",
        message: "Alert lookup not yet implemented",
      },
    });
  });

  // Manually resolve an alert
  app.post<{
    Params: { id: string };
    Body: { action: "refund" | "dismiss"; note?: string };
  }>("/:id/resolve", async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    // TODO: Validate request body
    // TODO: Fetch alert, verify it's in escalated/new state
    // TODO: If action=refund, execute refund via Stripe
    // TODO: Update alert status
    // TODO: Write audit log

    app.log.info(
      { alertId: id, action: body.action },
      "Manual alert resolution",
    );

    return reply.send({
      success: true,
      data: { id, status: body.action === "refund" ? "manually_resolved" : "dismissed" },
    });
  });
}
