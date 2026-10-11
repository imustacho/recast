import { useTranslation } from "react-i18next";
import { Clock, Home, Settings } from "lucide-react";
interface MobileBottomNavProps {
  activeTab: "home" | "history" | "settings";
  onSelectTab: (tab: "home" | "history" | "settings") => void;
}
export function MobileBottomNav({ activeTab, onSelectTab }: MobileBottomNavProps) {
  const { t } = useTranslation();
  return <nav className="mobile-nav pb-safe" aria-label="Mobile Navigation">
    {([{ id: "home", label: "convertNav", icon: Home }, { id: "history", label: "history", icon: Clock }, { id: "settings", label: "settings", icon: Settings }] as const).map(({id,label,icon:Icon}) =>
      <button key={id} type="button" onClick={() => onSelectTab(id)} aria-current={activeTab === id ? "page" : undefined} className={activeTab === id ? "is-active" : ""}>
        <Icon className="h-4 w-4" /><span>{t(label)}</span>
      </button>)}
  </nav>;
}
