import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const QrScanner = ({ onClose }) => {
    const [scannedText, setScannedText] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const qrCodeRegionId = "qr-reader";
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        Html5Qrcode.getCameras()
            .then((devices) => {
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    setSelectedCameraId(devices[0].id);
                }
            })
            .catch((err) => {
                console.error("Ошибка получения камер:", err);
            });
    }, []);

    const startScanner = async () => {
        if (!selectedCameraId) return;

        await stopScanner(); // остановим предыдущий сканер перед запуском нового
        html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
        try {
            await html5QrCodeRef.current.start(
                selectedCameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true,
                    },
                },
                (decodedText) => {
                    setScannedText(decodedText);
                },
                () => {}
            );
            setIsScanning(true);
        } catch (err) {
            console.error("Ошибка запуска сканера:", err);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
            setIsScanning(false);
        }
    };

    useEffect(() => {
        startScanner();
        return () => {
            stopScanner();
        };
    }, [selectedCameraId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col justify-between items-center p-4 overflow-y-auto">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl"
            >
                ×
            </button>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm">
                <Select
                    value={selectedCameraId || ""}
                    onValueChange={(value) => {
                        setSelectedCameraId(value);
                        startScanner();
                    }}
                    disabled={cameras.length === 0}
                >
                    <SelectTrigger className="w-full bg-white py-1 px-3 text-sm">
                        <SelectValue placeholder="Выберите камеру" />
                    </SelectTrigger>
                    <SelectContent>
                        {cameras.map((camera) => (
                            <SelectItem key={camera.id} value={camera.id}>
                                {camera.label || `Камера ${camera.id}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div
                id={qrCodeRegionId}
                className="flex justify-center w-full h-[100vw] max-h-[100vh] max-w-sm bg-gray-100 rounded-md aspect-square"
            />

            {scannedText && (
                <p className="text-green-600 font-semibold">
                    Результат: {scannedText}
                </p>
            )}
        </div>
    );
};

export default QrScanner;