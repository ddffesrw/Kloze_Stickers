import { useState } from "react";
import { Check, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Import avatars
import female1 from "@/assets/avatars/female-1.png";
import female2 from "@/assets/avatars/female-2.png";
import female3 from "@/assets/avatars/female-3.png";
import female4 from "@/assets/avatars/female-4.png";
import female5 from "@/assets/avatars/female-5.png";
import male1 from "@/assets/avatars/male-1.png";
import male2 from "@/assets/avatars/male-2.png";
import male3 from "@/assets/avatars/male-3.png";
import male4 from "@/assets/avatars/male-4.png";
import male5 from "@/assets/avatars/male-5.png";

const femaleAvatars = [
  { id: "f1", src: female1, name: "Ela" },
  { id: "f2", src: female2, name: "Yuki" },
  { id: "f3", src: female3, name: "Luna" },
  { id: "f4", src: female4, name: "Maya" },
  { id: "f5", src: female5, name: "Lila" },
];

const maleAvatars = [
  { id: "m1", src: male1, name: "Can" },
  { id: "m2", src: male2, name: "Leo" },
  { id: "m3", src: male3, name: "Efe" },
  { id: "m4", src: male4, name: "Kaan" },
  { id: "m5", src: male5, name: "Arda" },
];

interface AvatarSelectorProps {
  currentAvatar: string;
  onAvatarChange: (avatar: string) => void;
  children: React.ReactNode;
}

export function AvatarSelector({ currentAvatar, onAvatarChange, children }: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [open, setOpen] = useState(false);

  const handleSelect = (avatarSrc: string) => {
    setSelectedAvatar(avatarSrc);
  };

  const handleConfirm = () => {
    onAvatarChange(selectedAvatar);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-background border-border/30">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-lg font-bold gradient-text">
            Profil Resmini Seç
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 overflow-y-auto pb-20">
          {/* Female Avatars */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="text-base">👩</span> Kız Avatarları
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {femaleAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar.src)}
                  className={cn(
                    "relative group rounded-2xl overflow-hidden border-2 transition-all duration-200",
                    selectedAvatar === avatar.src
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border/30 hover:border-primary/50"
                  )}
                >
                  <div className="aspect-square">
                    <img
                      src={avatar.src}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedAvatar === avatar.src && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <span className="text-[9px] font-medium text-white">{avatar.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Male Avatars */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <span className="text-base">👨</span> Erkek Avatarları
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {maleAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar.src)}
                  className={cn(
                    "relative group rounded-2xl overflow-hidden border-2 transition-all duration-200",
                    selectedAvatar === avatar.src
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-border/30 hover:border-primary/50"
                  )}
                >
                  <div className="aspect-square">
                    <img
                      src={avatar.src}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedAvatar === avatar.src && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <span className="text-[9px] font-medium text-white">{avatar.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleConfirm}
            className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-bold glow-violet"
          >
            <Check className="w-5 h-5 mr-2" />
            Avatarı Kaydet
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}