"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductForm } from "@/components/products/product-form";
import {
  productsRepository,
  type ProductDetail,
} from "@/lib/repositories/products";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">(
    "loading"
  );

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        const currentUserId = data.session?.user.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const detail = await productsRepository.getDetail(currentUserId, params.id);
        setProduct(detail);
        setState(detail ? "found" : "missing");
      });
  }, [params.id]);

  if (state === "loading") {
    return (
      <p className="px-margin-mobile py-6 text-body-sm-dense text-on-surface-variant">
        Cargando…
      </p>
    );
  }

  if (state === "missing" || !product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-margin-mobile text-center">
        <p className="text-body-lg text-on-surface">Producto no encontrado.</p>
        <Link
          href="/products"
          className="text-body-lg text-primary underline-offset-4 hover:underline"
        >
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <ProductForm
      key={product.id}
      initial={product}
      submitLabel="Guardar cambios"
      onSubmit={async (input) => {
        if (!userId) return;
        await productsRepository.update(userId, params.id, input);
        toast("Producto actualizado");
        router.push(`/products/${params.id}`);
      }}
    />
  );
}
