import { describe, expect, it } from "vitest";
import ch02 from "./__fixtures__/nhsn2026/ch02-timeline.cases.json";
import transfer from "./__fixtures__/nhsn2026/ch02-transfer.cases.json";
import ch10 from "./__fixtures__/nhsn2026/ch10-vac.cases.json";
import ch07 from "./__fixtures__/nhsn2026/ch07-iuc.cases.json";
import {
  ADMISSION,
  dateToHd,
  hdToDate,
} from "./__fixtures__/nhsn2026/nhsn2026-adapter";
import {
  clinicalIwp,
  clinicalRitEnd,
  clinicalSbapWindow,
  isDeviceAssociated,
  poaOrHai,
  splitDeviceEpisodes,
} from "./nkbv-shared-timeline";
import { computeVacFromDailyVent } from "./nkbv-vae-vent-compute";
import { attributeLocationOfAttribution } from "./nkbv-timeline-math";

type Tinh = {
  moc_hd?: number;
  doe_hd?: number;
  iwp?: [number, number];
  rit?: [number, number];
  sbap?: [number, number];
  phan_loai?: string;
};

describe("NHSN 2026 Ch.02 — mốc thời gian (gắn tay từ `tinh` của gói)", () => {
  for (const c of ch02.ca) {
    (c.su_kien as unknown as Tinh[]).forEach((t, i) => {
      it(`${c.ma}#${i}`, () => {
        const moc = t.moc_hd != null ? hdToDate(t.moc_hd) : undefined;
        const doe = t.doe_hd != null ? hdToDate(t.doe_hd) : undefined;
        if (moc && t.iwp) {
          const w = clinicalIwp(moc);
          expect([dateToHd(w.start), dateToHd(w.end)]).toEqual(t.iwp);
        }
        if (doe && t.rit) {
          expect(dateToHd(clinicalRitEnd(doe))).toBe(t.rit[1]);
        }
        if (moc && doe && t.sbap) {
          const w = clinicalSbapWindow(moc, doe);
          expect([dateToHd(w.start), dateToHd(w.end)]).toEqual(t.sbap);
        }
        if (doe && t.phan_loai) {
          expect(poaOrHai(ADMISSION, doe).haiStatus).toBe(t.phan_loai);
        }
      });
    });
  }
});

describe("NHSN 2026 Ch.02 — Transfer Rule (gắn tay)", () => {
  for (const c of transfer.ca) {
    it(c.ma, () => {
      const stays = c.stays.map((s) => ({
        khoa_id: s.khoa_id,
        ten_khoa: s.khoa_id,
        ngay_vao: s.ngay_vao,
        ngay_ra: s.ngay_ra ?? undefined,
      }));
      const r = attributeLocationOfAttribution(stays, c.doe);
      expect(r.attributedStay?.khoa_id).toBe(c.loa);
    });
  }
});

describe("NHSN 2026 Ch.07 — CAUTI Day 3+ / Gap Rule (gắn tay)", () => {
  for (const c of ch07.ca) {
    it(c.ma, () => {
      const eps = splitDeviceEpisodes(c.iuc_days);
      for (const [doe, expected] of Object.entries(c.cauti_doe)) {
        const prev = addPrev(doe);
        const ep = eps
          .filter((e) => e.start <= doe && e.end >= prev)
          .sort((a, b) => b.start.localeCompare(a.start))[0];
        const got = ep
          ? isDeviceAssociated({ placedDate: ep.start, removedDate: ep.end, doe }).associated
          : false;
        expect({ doe, got }).toEqual({ doe, got: expected });
      }
    });
  }
});

function addPrev(d: string): string {
  return new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10);
}

/** Ca VAC mà lõi hiện tại chưa đúng — sửa ở GĐ2 lát 2 (V10.10/21/22). */
const VAC_CHUA_DUNG_LOI = new Set<string>([]);

describe("NHSN 2026 Ch.10 — VAC từ bảng ngày (gắn tay)", () => {
  for (const c of ch10.ca) {
    const run = VAC_CHUA_DUNG_LOI.has(c.ma) ? it.fails : it;
    run(`${c.ma} — ${c.gan_tay}`, () => {
      const rows = c.peep_min.map((p, i) => ({
        date: hdToDate(i + 2, "2026-05-31"),
        peep_min: p,
        fio2_min: Math.round(c.fio2_min_fraction[i] * 100),
      }));
      const r = computeVacFromDailyVent(rows);
      const doe = c.doe_ngay_may_tho == null ? null : hdToDate(c.doe_ngay_may_tho + 1, "2026-05-31");
      expect(r.suggested_doe).toBe(doe);
    });
  }
});
