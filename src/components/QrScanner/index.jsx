import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const QrScanner = ({ onClose }) => {
    const [scannedText, setScannedText] = useState("");
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
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

        await stopScanner();
        html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
        try {
            await html5QrCodeRef.current.start(
                selectedCameraId,
                {
                    fps: 10,
                    qrbox: 250,
                    rememberLastUsedCamera: true,
                    aspectRatio: 4 / 3,
                },
                (decodedText) => {
                    setScannedText(decodedText);
                },
                () => {}
            );

            const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
            if (capabilities.zoom) {
                setMinZoom(capabilities.zoom.min);
                setMaxZoom(capabilities.zoom.max);
                setZoomLevel(capabilities.zoom.min);
            }
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

    const applyZoom = async (zoomValue) => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.applyVideoConstraints({
                    advanced: [{ zoom: zoomValue }],
                });
            } catch (error) {
                console.error("Не удалось применить зум:", error);
            }
        }
    };

    useEffect(() => {
        startScanner();
        return () => {
            stopScanner();
        };
    }, [selectedCameraId]);

    useEffect(() => {
        applyZoom(zoomLevel);
    }, [zoomLevel]);

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

            <div
                id={qrCodeRegionId}
                className="flex w-full h-full max-w-sm rounded-md"
            />

            {maxZoom > minZoom && (
                <div className="flex flex-col items-center space-y-2 mt-4 w-full max-w-sm">
                    <label htmlFor="zoomRange" className="text-sm font-medium text-foreground">
                        Зум:
                    </label>
                    <Slider
                        id="zoomRange"
                        min={minZoom}
                        max={maxZoom}
                        step={0.1}
                        value={[zoomLevel]}
                        onValueChange={([value]) => setZoomLevel(value)}
                        className="w-full"
                    />
                </div>
            )}

            {scannedText && (
                <p className="text-green-600 font-semibold">
                    Результат: {scannedText}
                </p>
            )}
        </div>
    );
};

export default QrScanner;