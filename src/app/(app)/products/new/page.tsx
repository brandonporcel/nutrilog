"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/components/products/product-form";
import { productsRepository } from "@/lib/repositories/products";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function NewProductPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user.id ?? null);
      });
  }, []);

  return (
    <ProductForm
      submitLabel="Guardar"
      onSubmit={async (input) => {
        if (!userId) return;
        await productsRepository.save(userId, input);
        toast("Producto guardado con éxito");
        router.push("/products");
      }}
    />
  );
}
