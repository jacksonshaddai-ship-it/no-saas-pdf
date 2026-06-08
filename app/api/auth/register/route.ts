import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z
    .string({ required_error: "Informe seu nome." })
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres.")
    .max(80, "Nome muito longo."),
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    .max(180, "E-mail muito longo."),
  password: z
    .string({ required_error: "Informe uma senha." })
    .min(8, "Senha deve ter pelo menos 8 caracteres.")
    .max(128, "Senha muito longa."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON", message: "Corpo inválido." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: "VALIDATION", message: first?.message ?? "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "Este e-mail já está cadastrado. Faça login." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      planCode: "FREE",
      role: "USER",
      isActive: true,
    },
    select: { id: true, name: true, email: true, planCode: true, createdAt: true },
  });

  return NextResponse.json(
    {
      ok: true,
      user,
      message: "Cadastro criado. Faça login para continuar.",
    },
    { status: 201 },
  );
}
