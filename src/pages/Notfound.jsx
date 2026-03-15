const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                <p className="text-xl text-muted-foreground mb-6">Page not found</p>
                <a href="/" className="text-primary hover:underline">
                    Return to login
                </a>
            </div>
        </div>
    );
};

export default NotFound;
