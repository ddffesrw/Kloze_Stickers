#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WhatsAppStickersPlugin, "WhatsAppStickers",
    CAP_PLUGIN_METHOD(isWhatsAppInstalled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(addStickerPack, CAPPluginReturnPromise);
)
