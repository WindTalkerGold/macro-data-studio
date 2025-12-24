"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { locales } from "@/i18n";

function switchLocalePath(pathname: string, locale: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${locale}`;
  // If first part is a locale, replace it; else prefix
  if (locales.includes(parts[0] as any)) {
    parts[0] = locale;
  } else {
    parts.unshift(locale);
  }
  return "/" + parts.join("/");
}

export default function Nav() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname() || "/";

  const nextLocale = locale === "en" ? "zh-CN" : "en";
  const switchHref = switchLocalePath(pathname, nextLocale);

  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/dashboard`} className="font-semibold">
            {t("app.title")}
          </Link>
          <Link href={`/${locale}/datasets`} className="text-sm">
            {t("nav.datasets")}
          </Link>
        </div>
        <Link href={switchHref} className="text-sm underline">
          {t("language.switch")}
        </Link>
      </nav>
    </header>
  );
}
