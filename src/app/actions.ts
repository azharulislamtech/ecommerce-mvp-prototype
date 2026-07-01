"use server";

import { redirect } from "next/navigation";

export async function createOrderAction() {
  redirect("/payment/success?order=SP-1028");
}

export async function retryPaymentAction() {
  redirect("/checkout");
}

export async function adminLoginAction() {
  redirect("/admin");
}
