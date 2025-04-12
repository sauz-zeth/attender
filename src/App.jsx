import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Хук для работы со сканером QR-кодов
function useQrScanner(onScanSuccess, onScanFailure, isActive) {
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            false
        );

        scannerRef.current.render(
            decodedText => onScanSuccess(decodedText),
            error => onScanFailure(error)
        );

        return () => {
            scannerRef.current
                ?.clear()
                .catch(() => {});
        };
    }, [isActive, onScanSuccess, onScanFailure]);

    return scannerRef;
}

export default function AttendanceTool() {
    const [token, setToken] = useState("");
    const [scanned, setScanned] = useState(false);
    const [studentsText, setStudentsText] = useState("");
    const [logs, setLogs] = useState([]);
    const [isMarking, setIsMarking] = useState(false);

    const parseStudents = useCallback(() => {
        return studentsText
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const [login, password] = line.split(":");
                return { login, password };
            });
    }, [studentsText]);

    // Функция для отметки всех
    const markAll = useCallback(async (tokenArg) => {
        if (!tokenArg) return;
        setLogs([]);
        setIsMarking(true);

        const students = parseStudents();
        for (const student of students) {
            try {
                const session = axios.create({ withCredentials: true });
                await session.post("https://attendance-app.mirea.ru/login", {
                    username: student.login,
                    password: student.password,
                });
                await session.get(`https://attendance-app.mirea.ru/selfapprove?token=${tokenArg}`);

                setLogs(prevLogs => [...prevLogs, `[✔] ${student.login} — OK`]);
            } catch (error) {
                setLogs(prevLogs => [
                    ...prevLogs,
                    `[✘] ${student.login} — ${error.message || "Ошибка"}`
                ]);
            }
        }
        setIsMarking(false);
    }, [parseStudents]);

    // Успешное сканирование: извлекаем токен и сразу отмечаем
    const handleScanSuccess = useCallback(decodedText => {
        const match = decodedText.match(/token=([a-z0-9-]+)/i);
        if (match) {
            const newToken = match[1];
            setToken(newToken);
            setScanned(true);
            // Сразу отправляем запрос
            markAll(newToken);
        }
    }, [markAll]);

    // Ошибки сканирования
    const handleScanFailure = useCallback(error => {
        console.warn("Ошибка сканирования:", error);
    }, []);

    // Инициируем сканирование, пока не отсканировано
    useQrScanner(handleScanSuccess, handleScanFailure, !scanned);

    // Возможность пересканировать
    const handleRescan = () => {
        setScanned(false);
        setToken("");
        setLogs([]);
    };

    return (
        <div className="p-4 space-y-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center">🧠 QR Attendance Tool</h1>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <p className="text-sm">1️⃣ Отсканируй QR с пары:</p>
                    {!scanned && <div id="qr-reader" className="w-full h-64" />}
                    {token && (
                        <p className="break-all text-xs">
                            🔗 Токен: <code>{token}</code>
                        </p>
                    )}
                    {scanned && (
                        <Button variant="outline" onClick={handleRescan}>
                            Сканировать снова
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <p className="text-sm">
                        2️⃣ Вставь список логинов и паролей (login:password, по строкам):
                    </p>
                    <textarea
                        className="w-full border rounded p-2 h-40 text-sm resize-none"
                        value={studentsText}
                        onChange={(e) => setStudentsText(e.target.value)}
                        placeholder="student1:pass1&#10;student2:pass2"
                    />
                </CardContent>
            </Card>

            {/* Кнопка не нужна, если запрос отправляется автоматически, но можно оставить для повтора */}
            <div className="text-center">
                <Button onClick={() => markAll(token)} disabled={!token || isMarking}>
                    {isMarking ? "Отмечаем..." : "🚀 Повторить отметку"}
                </Button>
            </div>

            <div className="mt-4 space-y-1 text-sm">
                {logs.map((log, i) => (
                    <div key={i} className="font-mono break-words">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}