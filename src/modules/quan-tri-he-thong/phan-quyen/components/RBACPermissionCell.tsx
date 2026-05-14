"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

interface RBACPermissionCellProps {
  actions: { key: string; label: string; icon: LucideIcon; color: string; full: string }[];
  /** `${module_name}::${action}` → permission id (O(1) lookup, tránh permissions.find mỗi ô). */
  permLookup: ReadonlyMap<string, string>;
  moduleName: string;
  roleName: string;
  rolePerms: Set<string>;
  onToggle: (permId: string) => void;
  moduleLabel: string;
}

function RBACPermissionCellInner({
  actions,
  permLookup,
  moduleName,
  roleName,
  rolePerms,
  onToggle,
  moduleLabel,
}: RBACPermissionCellProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {actions.map((action) => {
        const permId = permLookup.get(`${moduleName}::${action.key}`);
        if (!permId) return <div key={action.key} className="w-8 h-8" />;

        const isChecked = rolePerms?.has(permId) || false;

        const activeBg = action.color.replace("text-", "bg-").split("-")[0] + "-50";
        const activeBorder = action.color.replace("text-", "border-").split("-")[0] + "-200";

        return (
          <label
            key={action.key}
            className={`
              relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-150 border
              ${
                isChecked
                  ? `${activeBg} ${activeBorder} shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]`
                  : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
              }
            `}
            title={`${roleName}: ${action.full} ${moduleLabel}`}
          >
            <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => onToggle(permId)} />
            <action.icon className={`w-3.5 h-3.5 ${isChecked ? action.color : "text-slate-200"} transition-colors`} />

            {isChecked && (
              <div className={`absolute top-0 right-0 w-1.5 h-1.5 ${action.color.replace("text-", "bg-")} rounded-bl-sm rounded-tr-sm`} />
            )}
          </label>
        );
      })}
    </div>
  );
}

export default React.memo(RBACPermissionCellInner);
