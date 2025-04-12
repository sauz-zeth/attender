import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode";

export default function AttendanceTool() {
    const [studentsText, setStudentsText] = useState("");
    const [logs, setLogs] = useState([]);
    const [isMarking, setIsMarking] = useState(false);

    // Разбиваем текст на список { login, password }
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

    // Отправляем запросы по всем студентам
    const markAll = useCallback(async (token) => {
        if (!token) return;

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

                await session.get(`https://attendance-app.mirea.ru/selfapprove?token=${token}`);

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

    // Инициализируем Html5QrcodeScanner и обрабатываем результат
    useEffect(() => {
        const scanner = new Html5QrcodeScanner("qr-reader", {
            fps: 10,
            // Жёстко задаём размеры и сохраняем квадратное соотношение сторон
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        }, /* verbose= */ false);

        // Обработчик удачного сканирования
        scanner.render(
            decodedText => {
                // Ищем в строке токен
                const match = decodedText.match(/token=([a-z0-9-]+)/i);
                if (match) {
                    // Сразу запускаем отметку
                    markAll(match[1]);
                    // После первого распознавания QR можно очистить сканер
                    scanner.clear().catch(() => {});
                }
            },
            error => {
                // Можем логировать ошибки сканирования
                console.warn("Ошибка сканирования:", error);
            }
        );

        // Возвращаем функцию очистки сканера при размонтировании компонента
        return () => {
            scanner.clear().catch(() => {});
        };
    }, [markAll]);

    return (
        <div className="p-4 space-y-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center">🧠 QR Attendance Tool</h1>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <p className="text-sm">1️⃣ Отсканируй QR с пары:</p>
                    {/* Окно камеры фиксированного размера */}
                    <div
                        id="qr-reader"
                        style={{ width: 250, height: 250, margin: "0 auto" }}
                    />
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

            <div className="mt-4 space-y-1 text-sm">
                {isMarking && <div>Обработка...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="font-mono break-words">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}