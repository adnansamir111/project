import { Router } from "express";
import { pool } from "../db";
import { authMiddleware } from "../middleware/auth";
import { withTx } from "../tx";

const router = Router();

function parseIntParam(value: string, name: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const err: any = new Error(`Invalid ${name}`);
    err.status = 400;
    throw err;
  }
  return n;
}

// POST /orgs - create organization
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.user_id; // from JWT (number)
    const { organization_name, organization_type, organization_code } = req.body;

    if (!organization_name || !organization_type || !organization_code) {
      return res.status(400).json({
        ok: false,
        error: "organization_name, organization_type, organization_code are required",
      });
    }

    const orgId = await withTx(req, async (client) => {
      const { rows } = await client.query(
        `SELECT sp_create_organization($1, $2, $3, $4) AS org_id`,
        [organization_name, organization_type, organization_code, userId]
      );
      return rows[0].org_id;
    });

    return res.status(201).json({
      ok: true,
      organization_id: orgId,
      organization_name,
      organization_type,
      organization_code,
    });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ ok: false, error: "organization_code already exists" });
    }
    next(err);
  }
});

// GET /orgs - list all organizations
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT organization_id, organization_name, organization_type, organization_code, created_at
       FROM organizations
       ORDER BY created_at DESC`
    );

    return res.json({ ok: true, organizations: rows });
  } catch (err) {
    next(err);
  }
});

// GET /orgs/:orgId - get org details
router.get("/:orgId", authMiddleware, async (req, res, next) => {
  try {
    const orgId = parseIntParam(req.params.orgId as string, "orgId");

    const { rows } = await pool.query(
      `SELECT organization_id, organization_name, organization_type, organization_code, created_at
       FROM organizations
       WHERE organization_id = $1`,
      [orgId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    return res.json({ ok: true, organization: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /orgs/:orgId/members - add member to organization
router.post("/:orgId/members", authMiddleware, async (req, res, next) => {
  try {
    const actorId = req.user!.user_id;
    const orgId = parseIntParam(req.params.orgId as string, "orgId");

    const { user_id, role_name } = req.body;

    const memberUserId = Number(user_id);
    if (!Number.isInteger(memberUserId) || memberUserId <= 0) {
      return res.status(400).json({ ok: false, error: "user_id must be a positive integer" });
    }

    if (!role_name) {
      return res.status(400).json({ ok: false, error: "role_name is required" });
    }

    if (!["OWNER", "ADMIN", "MEMBER"].includes(role_name)) {
      return res.status(400).json({
        ok: false,
        error: "role_name must be OWNER, ADMIN, or MEMBER",
      });
    }

    await withTx(req, async (client) => {
      await client.query(`SELECT sp_add_org_member($1, $2, $3, $4)`, [
        orgId,
        memberUserId,
        role_name,
        actorId,
      ]);
    });

    return res.status(204).send();
  } catch (err: any) {
    if (err.code === "28000") {
      return res.status(403).json({ ok: false, error: "Not authorized to add members" });
    }
    if (err.code === "22023") {
      return res.status(400).json({ ok: false, error: "Invalid role_name" });
    }
    next(err);
  }
});

// GET /orgs/:orgId/members - list org members
router.get("/:orgId/members", authMiddleware, async (req, res, next) => {
  try {
    const orgId = parseIntParam(req.params.orgId as string, "orgId");

    const { rows } = await pool.query(`SELECT * FROM sp_get_org_members($1)`, [orgId]);

    return res.json({ ok: true, members: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
