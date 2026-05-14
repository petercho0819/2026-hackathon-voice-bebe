"use client";

import { setupIonicReact } from "@ionic/react";
import { useEffect, useState } from "react";

setupIonicReact({
  mode: "md",
});

export default function IonicProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}
