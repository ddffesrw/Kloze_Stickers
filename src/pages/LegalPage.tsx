import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LegalPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-40 glass-card border-b border-border/20 px-4 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold gradient-text">Yasal Bilgiler</h1>
            </header>

            <div className="p-4">
                <Tabs defaultValue="privacy" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4">
                        <TabsTrigger value="privacy">Gizlilik Politikası</TabsTrigger>
                        <TabsTrigger value="terms">Kullanım Koşulları</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-180px)] rounded-2xl border border-border/30 bg-muted/10 p-4">

                        <TabsContent value="privacy" className="text-sm space-y-4 text-muted-foreground">
                            <h2 className="text-lg font-bold text-foreground">Gizlilik Politikası</h2>
                            <p>Son Güncelleme: 23 Ocak 2025</p>

                            <h3 className="text-base font-semibold text-foreground">1. Toplanan Veriler</h3>
                            <p>
                                Kloze Sticker Studio ("Uygulama") olarak, hizmetlerimizi sağlamak için aşağıdaki verileri topluyoruz:
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Kimlik Bilgileri: E-posta adresi, profil ismi ve avatar (Google/Apple girişleri üzerinden).</li>
                                    <li>Kullanım Verileri: Oluşturulan stickerlar, kredi kullanımı ve teknik loglar.</li>
                                    <li>Cihaz Bilgileri: IP adresi, cihaz modeli ve işletim sistemi sürümü.</li>
                                </ul>
                            </p>

                            <h3 className="text-base font-semibold text-foreground">2. Verilerin Kullanımı</h3>
                            <p>
                                Verileriniz şu amaçlarla kullanılır:
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>AI görsel üretim hizmetini sağlamak.</li>
                                    <li>Kredi bakiyenizi yönetmek ve saklamak.</li>
                                    <li>Uygulama güvenliğini sağlamak ve kötüye kullanımı önlemek.</li>
                                </ul>
                            </p>

                            <h3 className="text-base font-semibold text-foreground">3. Üçüncü Taraf Paylaşımı</h3>
                            <p>
                                Görsel üretimi için yazılan metinler (promptlar), işlenmek üzere yapay zeka sağlayıcılarımıza (Runware, Hugging Face vb.) iletilir.
                                Kişisel kimlik bilgileriniz (e-posta vb.) bu sağlayıcılarla paylaşılmaz.
                            </p>

                            <h3 className="text-base font-semibold text-foreground">4. Veri Silme</h3>
                            <p>
                                Hesabınızı ve verilerinizi silmek için Profil sayfasındaki hesap silme seçeneğini kullanabilir veya johnaxe.storage@gmail.com adresine talepte bulunabilirsiniz.
                            </p>
                        </TabsContent>

                        <TabsContent value="terms" className="text-sm space-y-4 text-muted-foreground">
                            <h2 className="text-lg font-bold text-foreground">Kullanım Koşulları (EULA)</h2>
                            <p>Son Güncelleme: 23 Ocak 2025</p>

                            <h3 className="text-base font-semibold text-foreground">1. Kabul</h3>
                            <p>Kloze uygulamasını indirerek ve kullanarak bu koşulları kabul etmiş sayılırsınız.</p>

                            <h3 className="text-base font-semibold text-foreground">2. AI İçerik Sorumluluğu</h3>
                            <p>
                                Uygulama yapay zeka kullanarak görsel üretir.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Yasadışı, nefret söylemi içeren, müstehcen veya şiddet içeren görseller üretmek yasaktır.</li>
                                    <li>Üretilen görsellerin ticari kullanım hakları kullanıcıya aittir, ancak sorumluluk tamamen kullanıcıdadır.</li>
                                    <li>Sistem, zararlı içerik taleplerini otomatik olarak reddetme hakkını saklı tutar.</li>
                                </ul>
                            </p>

                            <h3 className="text-base font-semibold text-foreground">3. Kredi ve Ödemeler</h3>
                            <p>
                                Satın alınan veya kazanılan krediler dijital ürünlerdir ve iade edilemez. Uygulama, kredi sistemini ve fiyatları önceden haber vermeksizin değiştirme hakkını saklı tutar.
                            </p>

                            <h3 className="text-base font-semibold text-foreground">4. Hesap Feshi</h3>
                            <p>
                                Kötüye kullanım, hile (farming) veya yasadışı içerik üretimi tespit edilirse hesabınız kalıcı olarak kapatılabilir.
                            </p>

                            <h3 className="text-base font-semibold text-foreground">5. İletişim</h3>
                            <p>
                                Her türlü yasal soru ve sorun bildiriimi için: johnaxe.storage@gmail.com
                            </p>
                        </TabsContent>

                    </ScrollArea>
                </Tabs>
            </div>
        </div>
    );
}
