-- Articles / blog, videos and editable static pages (About, Privacy, Terms, …).
-- Same model as the other content tables: multilingual jsonb fields, content_status,
-- the public reads only "published" rows, content staff (admin / editor) write.
-- Body text is Markdown per language: {"bal": "…", "en": "…", "ur": "…"}.

create table if not exists public.articles (
  id           bigint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        jsonb not null check (public.is_l(title)),
  excerpt      jsonb check (excerpt is null or jsonb_typeof(excerpt) = 'object'),
  body         jsonb check (body is null or jsonb_typeof(body) = 'object'),
  cover_path   text,
  category     text not null default 'news',
  tags         text[] not null default '{}',
  author_id    bigint references public.authors(id) on delete set null,
  author_text  jsonb check (author_text is null or jsonb_typeof(author_text) = 'object'),
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists articles_author on public.articles (author_id);
create index if not exists articles_published on public.articles (status, published_at desc);

create table if not exists public.videos (
  id             bigint generated always as identity primary key,
  title          jsonb not null check (public.is_l(title)),
  description    jsonb check (description is null or jsonb_typeof(description) = 'object'),
  url            text not null check (url ~* '^https://'),
  thumbnail_path text,
  duration       text,
  author_id      bigint references public.authors(id) on delete set null,
  status         public.content_status not null default 'draft',
  sort           integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists videos_author on public.videos (author_id);

create table if not exists public.pages (
  id         bigint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title      jsonb not null check (public.is_l(title)),
  body       jsonb check (body is null or jsonb_typeof(body) = 'object'),
  status     public.content_status not null default 'draft',
  updated_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['articles','videos','pages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public reads published %1$s" on public.%1$I', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "staff delete %1$s" on public.%1$I', t);
    execute format('create policy "public reads published %1$s" on public.%1$I for select using (status = ''published'' or (select public.content_is_staff()))', t);
    execute format('create policy "staff insert %1$s" on public.%1$I for insert with check ((select public.content_is_staff()))', t);
    execute format('create policy "staff update %1$s" on public.%1$I for update using ((select public.content_is_staff())) with check ((select public.content_is_staff()))', t);
    execute format('create policy "staff delete %1$s" on public.%1$I for delete using ((select public.content_is_staff()))', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- homepage sections for the new modules
insert into public.homepage_sections (key, enabled, sort) values
  ('videos', true, 25),
  ('articles', true, 75)
on conflict (key) do nothing;

-- starter pages (drafted by the Labzaank team; Privacy and Terms need a legal review before launch)
insert into public.pages (slug, title, body, status) values
('about',
 '{"bal":"مئے بارءَ","bal-latn":"Mai bárá","en":"About Labzaank","ur":"ہمارے بارے میں"}',
 jsonb_build_object(
  'en', E'Labzaank is a digital home for Balochi literature — poetry, poets, books, folk literature, recordings and a Balochi dictionary — in Balochi, English and Urdu.\n\n## What we publish\n\nOriginal Balochi texts are kept exactly as written. Roman Balochi and translations are added by editors and shown only after review; a translation never replaces the original.\n\n## Rights and sources\n\nEvery work, recording and dictionary entry carries its source. We publish only material we have permission to share, and books can be read online only where the rights allow.\n\n## Contribute\n\nWriters, scholars and readers can help with texts, translations, recordings and corrections. [Write to us](contact.html).',
  'ur', E'لبزانک بلوچی ادب کا ڈیجیٹل گھر ہے — شاعری، شعرا، کتابیں، لوک ادب، آوازیں اور بلوچی لغت — بلوچی، انگریزی اور اردو میں۔\n\n## ہم کیا شائع کرتے ہیں\n\nاصل بلوچی متن بالکل ویسا ہی رکھا جاتا ہے جیسا لکھا گیا۔ رومن بلوچی اور ترجمے مدیر شامل کرتے ہیں اور جائزے کے بعد ہی دکھائے جاتے ہیں؛ ترجمہ کبھی اصل کی جگہ نہیں لیتا۔\n\n## حقوق اور مآخذ\n\nہر تخلیق، ریکارڈنگ اور لغت کے اندراج کے ساتھ اس کا ماخذ درج ہوتا ہے۔ ہم صرف وہی مواد شائع کرتے ہیں جس کی اجازت ہو، اور کتابیں صرف وہیں آن لائن پڑھی جا سکتی ہیں جہاں حقوق اجازت دیں۔\n\n## شراکت\n\nادیب، محققین اور قارئین متن، ترجمے، ریکارڈنگ اور اصلاح میں مدد کر سکتے ہیں۔ [ہمیں لکھیں](contact.html)۔',
  'bal', E'لبزانک بلوچی لبزانک ءِ ڈیجیٹل لوگ اِنت — شاعری، شاعر، کتاب، دودی لبزانک، توار ءُ بلوچی لبزبلد — بلوچی، انگریزی ءُ اردو ءَ.\n\n## ما چے شنگ کنیں\n\nاصلیں بلوچی نبشتانک ہما رنگ ءَ داشتگ بنت کہ نبشتہ بوتگ اَنت. رومن ءُ رجانک ایڈیٹر شامل کن اَنت ءُ چارگ ءَ رند پیش دارگ بنت.\n\n## کمک\n\nنبشتہ کار، زانتکار ءُ وانوک گوں نبشتانک، رجانک ءُ توار ءَ کمک کرت کن اَنت. [مارا نبشتہ کن](contact.html).'
 ), 'published'),
('privacy',
 '{"bal":"راز داری","bal-latn":"Ráz-dári","en":"Privacy policy","ur":"رازداری کی پالیسی"}',
 jsonb_build_object(
  'en', E'*Draft — to be reviewed with a legal adviser before launch.*\n\n## What we collect\n\n- **Newsletter:** your email address and preferred language.\n- **Contact form:** your name, email address and message.\n- **Staff accounts:** the email address used to sign in to the admin.\n\nWe do not use advertising or tracking cookies. Your browser keeps a few preferences on your own device — the language for this visit, poems you mark as favourites and recent dictionary searches. These are not sent to us.\n\n## Where it is kept\n\nThe site is hosted on Vercel. The database, file storage and sign-in run on Supabase.\n\n## How we use it\n\nNewsletter addresses are used only to send the newsletter. Contact messages are used only to reply to you. We do not sell or share personal data.\n\n## Your choices\n\nYou can ask us to delete your email address or messages at any time through the [contact page](contact.html).',
  'ur', E'*مسودہ — اجرا سے پہلے قانونی مشیر سے جائزہ ضروری ہے۔*\n\n## ہم کیا جمع کرتے ہیں\n\n- **نیوز لیٹر:** آپ کا ای میل اور پسندیدہ زبان۔\n- **رابطہ فارم:** آپ کا نام، ای میل اور پیغام۔\n- **عملے کے اکاؤنٹ:** ایڈمن میں سائن اِن کے لیے ای میل۔\n\nہم اشتہاری یا ٹریکنگ کوکیز استعمال نہیں کرتے۔ آپ کا براؤزر چند ترجیحات آپ ہی کے آلے پر رکھتا ہے — اس وزٹ کی زبان، پسندیدہ نظمیں اور لغت کی حالیہ تلاش۔ یہ ہمیں نہیں بھیجی جاتیں۔\n\n## ڈیٹا کہاں رکھا جاتا ہے\n\nسائٹ Vercel پر ہے۔ ڈیٹا بیس، فائلیں اور سائن اِن Supabase پر چلتے ہیں۔\n\n## استعمال\n\nنیوز لیٹر کے ای میل صرف نیوز لیٹر بھیجنے کے لیے، اور پیغامات صرف جواب دینے کے لیے استعمال ہوتے ہیں۔ ہم ذاتی ڈیٹا نہ بیچتے ہیں نہ کسی کو دیتے ہیں۔\n\n## آپ کا اختیار\n\nآپ کسی بھی وقت [رابطہ صفحے](contact.html) سے اپنا ای میل یا پیغامات حذف کرنے کا کہہ سکتے ہیں۔'
 ), 'published'),
('terms',
 '{"bal":"شرط","bal-latn":"Shart","en":"Terms of use","ur":"شرائطِ استعمال"}',
 jsonb_build_object(
  'en', E'*Draft — to be reviewed with a legal adviser before launch.*\n\n## Content and rights\n\nPoems, books, recordings and images belong to their authors and rights holders. You may read and listen for personal, non-commercial use. Please do not republish material from Labzaank without the rights holder''s permission.\n\n## Dictionary and translations\n\nDictionary entries and translations are prepared by editors and may contain mistakes. Entries show their review status and source.\n\n## Contributions\n\nWhen you send us texts, recordings or corrections, you confirm that you have the right to share them and allow us to publish them with credit.\n\n## Links\n\nLabzaank links to other websites. We are not responsible for their content.\n\n## Changes\n\nThese terms may change; the current version is always on this page.',
  'ur', E'*مسودہ — اجرا سے پہلے قانونی مشیر سے جائزہ ضروری ہے۔*\n\n## مواد اور حقوق\n\nنظمیں، کتابیں، ریکارڈنگ اور تصاویر اپنے مصنفین اور حق داروں کی ملکیت ہیں۔ آپ انہیں ذاتی، غیر تجارتی استعمال کے لیے پڑھ اور سن سکتے ہیں۔ حق دار کی اجازت کے بغیر لبزانک کا مواد دوبارہ شائع نہ کریں۔\n\n## لغت اور ترجمے\n\nلغت کے اندراجات اور ترجمے مدیر تیار کرتے ہیں اور ان میں غلطی ممکن ہے۔ ہر اندراج کے ساتھ اس کی جانچ کی حالت اور ماخذ درج ہوتا ہے۔\n\n## شراکت\n\nجب آپ ہمیں متن، ریکارڈنگ یا اصلاح بھیجتے ہیں تو آپ تصدیق کرتے ہیں کہ آپ کو انہیں شیئر کرنے کا حق ہے اور ہمیں حوالے کے ساتھ شائع کرنے کی اجازت دیتے ہیں۔\n\n## روابط\n\nلبزانک دوسری ویب سائٹس کے روابط دیتا ہے؛ ان کے مواد کی ذمہ داری ہم پر نہیں۔\n\n## تبدیلیاں\n\nیہ شرائط بدل سکتی ہیں؛ تازہ ترین ورژن ہمیشہ اسی صفحے پر ہوگا۔'
 ), 'published')
on conflict (slug) do nothing;

insert into public.articles (slug, title, excerpt, body, category, tags, status, published_at) values
('welcome-to-labzaank',
 '{"bal":"لبزانک ءَ وش آتکے","bal-latn":"Labzaanká wash átké","en":"Welcome to Labzaank","ur":"لبزانک میں خوش آمدید"}',
 '{"bal":"بلوچی لبزانک ءِ نوکیں ڈیجیٹل لوگ — شعر، کتاب، توار ءُ لبزبلد.","en":"A new digital home for Balochi literature — poetry, books, recordings and a dictionary.","ur":"بلوچی ادب کا نیا ڈیجیٹل گھر — شاعری، کتابیں، آوازیں اور لغت۔"}',
 jsonb_build_object(
  'en', E'Labzaank brings Balochi literature together in one place: classical and modern poetry in the original script, profiles of poets, a growing library, folk literature, recordings and a Balochi dictionary.\n\n## Read it your way\n\nEvery page works in Balochi (Arabic script), English and Urdu. Poems are always shown in the original Balochi first, with Roman script and reviewed translations alongside.\n\n## Built with care for rights\n\nWe credit every source and publish only what we are allowed to share. If you hold rights to a work and want it added or removed, please [contact us](contact.html).\n\n## What comes next\n\nMore poets and poems, readable books, recorded recitations and dictionary words reviewed by native speakers. Subscribe to the newsletter to follow along.',
  'ur', E'لبزانک بلوچی ادب کو ایک جگہ جمع کرتا ہے: اصل رسم الخط میں کلاسیکی اور جدید شاعری، شعرا کے تعارف، بڑھتا ہوا کتب خانہ، لوک ادب، آوازیں اور بلوچی لغت۔\n\n## اپنی زبان میں پڑھیں\n\nہر صفحہ بلوچی، انگریزی اور اردو میں دستیاب ہے۔ نظمیں ہمیشہ پہلے اصل بلوچی میں دکھائی جاتی ہیں، ساتھ رومن اور منظور شدہ ترجمہ۔\n\n## حقوق کا احترام\n\nہم ہر ماخذ کا حوالہ دیتے ہیں اور صرف وہی شائع کرتے ہیں جس کی اجازت ہو۔ اگر آپ کسی تخلیق کے حق دار ہیں تو [ہم سے رابطہ کریں](contact.html)۔\n\n## آگے کیا\n\nمزید شعرا اور نظمیں، آن لائن کتابیں، ریکارڈ شدہ کلام، اور اہلِ زبان کے جائزہ شدہ الفاظ۔ خبروں کے لیے نیوز لیٹر میں شامل ہوں۔'
 ),
 'news', '{labzaank,announcement}', 'published', now())
on conflict (slug) do nothing;
