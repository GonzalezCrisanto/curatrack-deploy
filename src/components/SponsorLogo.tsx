import { useSponsor } from '@/context/SponsorContext';
import { Activity } from 'lucide-react';

type Props = {
  className?: string;
  showName?: boolean;
  variant?: 'default' | 'light';
};

export function SponsorLogo({ className = '', showName = true, variant = 'default' }: Props) {
  const { sponsor } = useSponsor();
  if (!sponsor) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-8 rounded-md bg-primary/10 animate-pulse" />
      </div>
    );
  }
  const textColor = variant === 'light' ? 'text-primary-foreground' : 'text-foreground';
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {sponsor.logo_url ? (
        <img src={sponsor.logo_url} alt={sponsor.sponsor_name} className="h-9 w-auto object-contain" />
      ) : (
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm"
          style={{ background: `linear-gradient(135deg, ${sponsor.primary_color}, ${sponsor.accent_color})` }}
        >
          <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
      )}
      {showName && (
        <div className="leading-tight">
          <div className={`font-display font-bold text-sm ${textColor} tracking-tight`}>{sponsor.app_name}</div>
          <div className={`font-body text-[10px] uppercase tracking-wider ${variant === 'light' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {sponsor.sponsor_label}
          </div>
        </div>
      )}
    </div>
  );
}
