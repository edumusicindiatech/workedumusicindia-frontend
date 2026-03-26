import { useTranslation } from "react-i18next"; // <-- Added import

const Index = () => {
    const { t } = useTranslation(); // <-- Initialize hook

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">WorkEduMusicIndia</h1>
                <p className="text-muted-foreground">{t('index.redirecting')}</p>
            </div>
        </div>
    );
};

export default Index;