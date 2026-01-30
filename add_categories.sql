-- Add Sanat and Psychedelic categories if they don't exist

INSERT INTO public.categories (name, emoji, sort_order, is_active)
SELECT 'Sanat', '🎨', 9, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Sanat');

INSERT INTO public.categories (name, emoji, sort_order, is_active)
SELECT 'Psychedelic', '🍄', 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Psychedelic');
