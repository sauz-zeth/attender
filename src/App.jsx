import React, { useState } from "react";
import QrScanner from "./components/QrScanner";
import { Button } from "@/components/ui/button";

const App = () => {
    const [showScanner, setShowScanner] = useState(false);

    return (
        <div className="p-6">
            <Button onClick={() => setShowScanner(true)}>Начать сканирование</Button>
            {showScanner && <QrScanner onClose={() => setShowScanner(false)} />}
        </div>
    );
};

export default App;