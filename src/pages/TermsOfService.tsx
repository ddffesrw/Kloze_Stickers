
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-40 glass-card border-b border-border/20 p-4 flex items-center gap-4">
                <Link to="/" className="p-2 rounded-full hover:bg-muted/20">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Kullanım Koşulları (EULA)
                </h1>
            </header>

            <main className="p-6 max-w-3xl mx-auto space-y-6 text-sm text-foreground/80 leading-relaxed">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 text-yellow-500">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-sm">Özet (Lütfen Okuyun)</h3>
                        <p className="text-xs opacity-90">Bu uygulama kullanıcı, sticker oluşturabilir ve paylaşabilir. Aşağılayıcı, saldırgan veya yasa dışı içerik paylaşmak kesinlikle yasaktır ve hesabınızın kapatılmasına neden olur.</p>
                    </div>
                </div>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">1. Kabul</h2>
                    <p>
                        Kloze uygulamasını indirerek veya kullanarak, bu Kullanıcı Lisans Sözleşmesi'ni (EULA) ve Gizlilik Politikamızı kabul etmiş sayılırsınız.
                        Bu şartları kabul etmiyorsanız, uygulamayı kullanmamalısınız.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">2. Kullanıcı Tarafından Oluşturulan İçerik (UGC)</h2>
                    <p>
                        Kullanıcılar metin, görsel ve sticker oluşturabilir ve paylaşabilir. Aşağıdaki içerik türlerine <strong>SIFIR TOLERANS</strong> politikamız vardır:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 mt-2 font-medium">
                        <li>Nefret söylemi, ırkçılık veya ayrımcılık içeren içerikler.</li>
                        <li>Çıplaklık, pornografi veya müstehcen materyaller.</li>
                        <li>Şiddet, tehdit veya taciz içeren davranışlar.</li>
                        <li>Telif haklarını ihlal eden materyaller.</li>
                    </ul>
                    <p className="mt-2">
                        İhlal durumunda içeriğiniz derhal kaldırılacak ve hesabınız kalıcı olarak yasaklanacaktır.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">3. Moderasyon ve Şikayet</h2>
                    <p>
                        Kloze, kullanıcı içeriğini izleme hakkını saklı tutar ancak yükümlü değildir.
                        Kullanıcılar uygunsuz içeriği "Şikayet Et" butonu ile bildirebilir.
                        Uygunsuz içerik şikayetleri <strong>24 saat içinde</strong> incelenir ve gerekli işlem yapılır.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">4. AI Teknolojisi Sorumluluk Reddi</h2>
                    <p>
                        Uygulama, görsel oluşturmak için Yapay Zeka kullanır. AI tarafından üretilen içeriklerin doğruluğu, benzersizliği veya uygunluğu garanti edilmez.
                        Oluşturulan içeriğin kullanımından doğacak her türlü yasal sorumluluk kullanıcıya aittir.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">5. Fikri Mülkiyet</h2>
                    <p>
                        Oluşturduğunuz stickerların mülkiyeti size aittir, ancak Kloze'a bu içeriği uygulamada gösterme, depolama ve dağıtma hakkı (lisansı) vermiş olursunuz.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">6. Değişiklikler</h2>
                    <p>
                        Kloze, bu şartları dilediği zaman güncelleme hakkını saklı tutar. Değişiklikler uygulamada yayınlandığı an yürürlüğe girer.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">7. İletişim</h2>
                    <p>
                        Sorularınız ve ihlal bildirimleri için: support@kloze.app
                    </p>
                </section>

                <p className="text-xs text-muted-foreground mt-8 border-t pt-4">
                    Son Güncelleme: 29 Ocak 2026
                </p>
            </main>
        </div>
    );
}
