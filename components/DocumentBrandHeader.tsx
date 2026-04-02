import { Building2, FileText, MapPin, MessageCircle } from "lucide-react";

type DocumentBrandHeaderProps = {
  companyName: string;
  cnpj?: string | null;
  document?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export function DocumentBrandHeader({
  companyName,
  cnpj,
  document,
  address,
  phone,
  logoUrl,
  title,
  subtitle,
  compact = false,
}: DocumentBrandHeaderProps) {
  const normalizedLogoUrl = logoUrl?.trim() || "/logo.png";
  const resolvedCompanyName = companyName?.trim() || "Sua Empresa";
  const resolvedDocument = cnpj?.trim() || document?.trim() || "";
  const metaClassName = compact
    ? "text-[10px] leading-[1.45]"
    : "text-xs leading-[1.55] sm:text-sm";
  const titleClassName = compact ? "text-[13px]" : "text-lg sm:text-2xl";
  const subtitleClassName = compact ? "text-[10px]" : "text-xs sm:text-sm";
  const iconClassName = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const logoClassName = compact ? "max-h-12" : "max-h-16 sm:max-h-20";

  return (
    <header className="border-b border-slate-200 pb-5">
      <div className="mx-auto max-w-3xl text-center">
        <img
          src={normalizedLogoUrl}
          alt={resolvedCompanyName}
          className={`document-logo mx-auto w-auto object-contain ${logoClassName}`}
        />

        <div className={`mt-3 space-y-1 text-slate-600 ${metaClassName}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-900">
            {resolvedCompanyName}
          </p>

          {resolvedDocument ? (
            <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
              <Building2 className={`${iconClassName} text-[#F59E0B]`} />
              <span>CNPJ: {resolvedDocument}</span>
            </p>
          ) : null}

          {address ? (
            <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
              <MapPin className={`${iconClassName} text-[#F59E0B]`} />
              <span>{address}</span>
            </p>
          ) : null}

          {phone ? <p>Telefone: {phone}</p> : null}

          {phone ? (
            <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
              <MessageCircle className={`${iconClassName} text-[#F59E0B]`} />
              <span>WhatsApp: {phone}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center">
          <div className="document-title-badge inline-flex max-w-full flex-wrap items-center justify-center gap-3 rounded-full border border-[#FACC15] bg-[#FFFDE7] px-4 py-2.5 text-left">
            <div className="rounded-full bg-[#FACC15]/25 p-2 text-[#B45309]">
              <FileText className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
            <div>
              <p
                className={`font-bold uppercase tracking-[0.08em] text-slate-950 ${titleClassName}`}
              >
                {title}
              </p>
              {subtitle ? (
                <p className={`text-slate-500 ${subtitleClassName}`}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
