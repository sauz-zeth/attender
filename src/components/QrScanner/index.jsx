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

function PinchZoomContainer({ children }) {
    const containerRef = React.useRef(null);
    const [scale, setScale] = React.useState(1);

    // Будем хранить активные пальцы
    const pointers = React.useRef([]);
    // Начальная дистанция между пальцами
    const initialDist = React.useRef(0);

    const getDistance = ([p1, p2]) => {
        const dx = p1.clientX - p2.clientX;
        const dy = p1.clientY - p2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const onPointerDown = (e) => {
        containerRef.current.setPointerCapture(e.pointerId);
        pointers.current.push(e);
        // Если два пальца, сохраним стартовую дистанцию
        if (pointers.current.length === 2) {
            initialDist.current = getDistance(pointers.current);
        }
    };

    const onPointerMove = (e) => {
        // Обновим инфу о пальцах
        pointers.current = pointers.current.map((p) =>
            p.pointerId === e.pointerId ? e : p
        );
        // Если два пальца
        if (pointers.current.length === 2) {
            const dist = getDistance(pointers.current);
            // При желании ограничим масштаб, напр. от 0.5 до 4
            const newScale = Math.min(Math.max(scale * (dist / initialDist.current), 0.5), 4);
            setScale(newScale);
            // Обновим "предыдущую" дистанцию
            initialDist.current = dist;
        }
    };

    const onPointerUpOrCancel = (e) => {
        containerRef.current.releasePointerCapture(e.pointerId);
        // Убираем палец из списка
        pointers.current = pointers.current.filter((p) => p.pointerId !== e.pointerId);
    };

    return (
        <div
            ref={containerRef}
            style={{
                touchAction: "none",
                overflow: "hidden",
                transform: `scale(${scale})`,
                transformOrigin: "center",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUpOrCancel}
            onPointerCancel={onPointerUpOrCancel}
        >
            {children}
        </div>
    );
}

const QrScanner = ({ onClose }) => {
    const [scannedText, setScannedText] = useState("");
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
        } catch (err) {
            console.error("Ошибка запуска сканера:", err);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
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

            <div className="flex justify-center my-4 absolute top-4 z-50">
                <Select
                    value={selectedCameraId || ""}
                    onValueChange={(value) => {
                        setSelectedCameraId(value);
                        startScanner();
                    }}
                    disabled={cameras.length === 0}
                >
                    <SelectTrigger className="w-50 bg-white py-1 px-3 text-xs relative">
                        <SelectValue placeholder="Выберите камеру" />
                    </SelectTrigger>
                    <SelectContent className="w-50 text-xs">
                        {cameras.map((camera) => (
                            <SelectItem
                                key={camera.id}
                                value={camera.id}
                                className="text-xs pr-10"
                            >
                                <span className="block truncate">{camera.label || `Камера ${camera.id}`}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <PinchZoomContainer>
                <div
                    id={qrCodeRegionId}
                    className="flex w-full h-full max-w-sm rounded-md"
                />
            </PinchZoomContainer>

            {scannedText && (
                <p className="text-green-600 font-semibold">
                    Результат: {scannedText}
                </p>
            )}
        </div>
    );
};

export default QrScanner;