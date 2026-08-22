"use client";

import React from "react";
import { ArrowRight, Beaker, ClipboardList, Building2, ShieldCheck } from "lucide-react";
import type { DanhMucHubRow } from "@/lib/master-data/danh-muc-hub-catalog";
import { QUAN_TRI_HUB_JOBS, rowsForHubJob, type QuanTriHubJobId } from "@/lib/master-data/quan-tri-hub-jobs";
import { quanTriFormChrome as UI } from "@/modules/quan-tri-he-thong/lib/quan-tri-form-chrome";

const JOB_ICON: Record<QuanTriHubJobId, React.ReactNode> = {
  "to-chuc": <Building2 className="h-5 w-5 text-rose-600" aria-hidden />,
  "bang-kiem": <ClipboardList className="h-5 w-5 text-orange-600" aria-hidden />,
  cssd: <Beaker className="h-5 w-5 text-emerald-700" aria-hidden />,
  "nguoi-dung": <ShieldCheck className="h-5 w-5 text-slate-600" aria-hidden />,
};

type Props = {
  rows: DanhMucHubRow[];
  allowedJobs: QuanTriHubJobId[];
  onOpen: (path: string) => void;
};

export default function QuanTriHubJobCards({ rows, allowedJobs, onOpen }: Props) {
  const jobs = QUAN_TRI_HUB_JOBS.filter((j) => allowedJobs.includes(j.id));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {jobs.map((job) => {
        const links = rowsForHubJob(rows, job.id).slice(0, 5);
        return (
          <article key={job.id} className={`${UI.inset} p-4`}>
            <button
              type="button"
              onClick={() => onOpen(job.href)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200/80">
                  {JOB_ICON[job.id]}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{job.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{job.blurb}</p>
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>
            {links.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {links.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(r.path)}
                      className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80 hover:bg-white hover:text-[var(--primary)]"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
