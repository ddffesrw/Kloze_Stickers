
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-40 glass-card border-b border-border/20 p-4 flex items-center gap-4">
                <Link to="/" className="p-2 rounded-full hover:bg-muted/20">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Gizlilik Politikası
                </h1>
            </header>

            <main className="p-6 max-w-3xl mx-auto space-y-6 text-sm text-foreground/80 leading-relaxed">
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">1. Giriş</h2>
                    <p>
                        Kloze ("Uygulama"), gizliliğinize önem verir. Bu Gizlilik Politikası, uygulamamızı kullandığınızda
                        verilerinizin nasıl toplandığını, kullanıldığını ve paylaşıldığını açıklar.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">2. Toplanan Veriler</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Hesap Bilgileri:</strong> Kayıt olurken sağladığınız e-posta adresi ve profil bilgileri.</li>
                        <li><strong>Kullanıcı İçeriği (UGC):</strong> Oluşturduğunuz stickerlar, yüklediğiniz görseller ve paket isimleri.</li>
                        <li><strong>Cihaz Bilgileri:</strong> Uygulama performansı ve hata ayıklama için kullanılan anonim cihaz verileri.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">3. Verilerin Kullanımı</h2>
                    <p>Verilerinizi şu amaçlarla kullanırız:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Hizmetlerimizi sağlamak ve geliştirmek.</li>
                        <li>Kullanıcı hesaplarını yönetmek.</li>
                        <li>İçerik moderasyonu sağlamak (Kötüye kullanımı önlemek).</li>
                        <li>Yasal yükümlülüklere uymak.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">4. AI ve Görüntü İşleme</h2>
                    <p>
                        Uygulama, görsel oluşturmak ve düzenlemek için Yapay Zeka (AI) teknolojileri kullanır.
                        Yüklediğiniz veya oluşturduğunuz görseller, işlenmek üzere geçici olarak sunucularımıza veya güvenli üçüncü taraf sağlayıcılara (örn. Hugging Face) iletilebilir.
                        Bu veriler, yalnızca talep ettiğiniz işlemi gerçekleştirmek için kullanılır ve AI model eğitimi için kullanılmaz.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">5. Veri Paylaşımı</h2>
                    <p>
                        Kişisel verilerinizi üçüncü taraflara satmayız. Verileriniz yalnızca şu durumlarda paylaşılabilir:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Yasal zorunluluklar (Mahkeme kararları vb.).</li>
                        <li>Hizmet sağlayıcılar (Sunucu barındırma, veritabanı).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">6. Kullanıcı Hakları</h2>
                    <p>
                        Hesabınızı ve ilişkin tüm verileri silme hakkına sahipsiniz. Bunun için uygulama içi "Hesabı Sil" seçeneğini kullanabilir veya bizimle iletişime geçebilirsiniz.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">7. İletişim</h2>
                    <p>
                        Gizlilik politikamızla ilgili sorularınız için: <br />
                        <strong>E-posta:</strong> support@kloze.app
                    </p>
                </section>

                <p className="text-xs text-muted-foreground mt-8 border-t pt-4">
                    Son Güncelleme: 29 Ocak 2026
                </p>
            </main>
        </div>
    );
}
