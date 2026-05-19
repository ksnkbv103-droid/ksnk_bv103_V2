-- KSNK Task 2.0: Seed Admin Profile for Testing
-- Ensures ksnkbv103@gmail.com has a profile in mdm_nhan_su

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.mdm_nhan_su WHERE lower(trim(email)) = 'ksnkbv103@gmail.com') THEN
        INSERT INTO public.mdm_nhan_su (ho_ten, email, ma_nv, is_active, vai_tro_he_thong_ksnk)
        VALUES ('Quản trị viên KSNK', 'ksnkbv103@gmail.com', 'ADMIN01', true, 'ADMIN, KSNK');
    ELSE
        UPDATE public.mdm_nhan_su 
        SET ho_ten = 'Quản trị viên KSNK',
            is_active = true,
            vai_tro_he_thong_ksnk = 'ADMIN, KSNK'
        WHERE lower(trim(email)) = 'ksnkbv103@gmail.com';
    END IF;
END $$;
