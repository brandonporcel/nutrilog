import Image from "next/image";

import { Logo } from "./logo";

export function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-container/10 p-12 md:flex md:w-1/2">
      <Image
        src="/auth/hero.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 0px, 50vw"
        className="absolute inset-0 z-0 object-cover opacity-40 mix-blend-multiply"
      />

      <div className="relative z-10">
        <Logo
          className="mb-8"
          iconClassName="size-9"
          textClassName="text-headline-lg"
        />
        <h1 className="max-w-sm text-headline-lg leading-tight text-on-primary-container">
          Alcanza tu meta diaria de proteína con precisión clínica.
        </h1>
      </div>

      <div className="relative z-10">
        <p className="mb-4 max-w-xs text-body-lg text-on-surface-variant">
          Monitorea cada gramo. Optimiza tus resultados. Mantén la disciplina.
        </p>
        <div className="flex gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <span className="size-2 rounded-full bg-primary/30" />
          <span className="size-2 rounded-full bg-primary/30" />
        </div>
      </div>
    </div>
  );
}
