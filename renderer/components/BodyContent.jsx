import React, { useState, useEffect } from 'react'
import { Tabs, Button, Table, Input, Form, message } from 'antd'
import ReceivedTab from '../pages/tabs/ReceivedTab'
import DeliveryTab from '../pages/tabs/DeliveryTab'
import ExternalTab from '../pages/tabs/ExternalTab'

export default function BodyContent() {
    const [activeKey, setActiveKey] = useState('1')
    const [ports, setPorts] = useState([])
    const [selectedPort, setSelectedPort] = useState(null)
    const [serialData, setSerialData] = useState('')
    const [cctvImage, setCctvImage] = useState(null)
    const [loadingCctv, setLoadingCctv] = useState(false)
    const [form] = Form.useForm()
    const [onnxResult, setOnnxResult] = useState(null)
    const [loadingOnnx, setLoadingOnnx] = useState(false)

    // =====================================================
    // Tabs definition
    // =====================================================
    const items = [
        { label: 'Received', key: '1', children: <ReceivedTab /> },
        { label: 'Delivery', key: '2', children: <DeliveryTab /> },
        { label: 'External', key: '3', children: <ExternalTab /> },
    ]

    // =====================================================
    // Fetch available COM ports
    // =====================================================
    const fetchPorts = async () => {
        try {
            const result = await window.electronAPI.listSerialPorts()
            setPorts(result)
            message.success(`Ditemukan ${result.length} port`)
        } catch (err) {
            console.error('Gagal ambil COM port:', err)
            message.error('Gagal mengambil daftar port COM')
        }
    }

    // =====================================================
    // Open selected COM port
    // =====================================================
    const handleOpenPort = async (path) => {
        try {
            const res = await window.electronAPI.openSerialPort(path)
            if (res.status === 'opened') {
                setSelectedPort(path)
                setSerialData('')
                message.success(`Port ${path} dibuka`)
            } else {
                message.warning(`Gagal buka port: ${res.message || 'unknown error'}`)
            }
        } catch (err) {
            console.error('Error buka port:', err)
            message.error('Gagal membuka port serial')
        }
    }

    // =====================================================
    // Listen real-time serial data from Electron
    // =====================================================
    useEffect(() => {
        if (!window.electronAPI?.onSerialData) {
            console.warn('⚠️ electronAPI.onSerialData tidak tersedia')
            return
        }

        // Listener untuk data serial (replace, bukan append)
        const handleData = (data) => {
            setSerialData(data.trim()) // ✅ hanya tampilkan data terakhir
        }

        window.electronAPI.onSerialData(handleData)

        // (Opsional) listener untuk error dan status
        window.electronAPI.onSerialError?.((err) =>
            message.error(`Serial error: ${err}`)
        )
        window.electronAPI.onSerialStatus?.((status) => {
            if (status === 'closed') {
                setSelectedPort(null)
                message.info('Port serial ditutup.')
            }
        })

        // Cleanup listener saat unmount
        return () => {
            try {
                window.electronAPI.removeAllListeners?.('serial-data')
            } catch {}
        }
    }, [])

    // =====================================================
    // Fetch CCTV image
    // =====================================================
    const handleFetchCctv = async (values) => {
        setLoadingCctv(true)
        setCctvImage(null)
        setOnnxResult(null)
        console.log('Fetching CCTV image with values:', values)
        try {
            const res = await window.electronAPI.fetchCctvImage(values)
            if (res.status === 'success') {
                setCctvImage(res.image)
                message.success('Snapshot CCTV berhasil diambil!')
            } else {
                message.error(res.message || 'Gagal mengambil gambar CCTV')
            }
        } catch (err) {
            message.error('Gagal mengakses kamera CCTV')
        } finally {
            setLoadingCctv(false)
        }
    }

    // =====================================================
    // Jalankan deteksi plat nomor (ONNX)
    // =====================================================
    const handleRunOnnxDetection = async () => {
        if (!cctvImage) {
            message.warning('Ambil snapshot CCTV terlebih dahulu.')
            return
        }

        try {
            setLoadingOnnx(true)

            console.log('📤 Mengirim gambar ke ONNX, panjang base64:', cctvImage?.length)
            if (!cctvImage.startsWith('data:image')) {
                message.error('Format gambar tidak valid (bukan base64).')
                setLoadingOnnx(false)
                return
            }

            const result = await window.electronAPI.runPlateDetection(cctvImage)
            console.log('📥 Hasil deteksi:', result)

            if (result.status === 'success') {
                setOnnxResult(result)
                message.success(`Plat terdeteksi (Confidence ${(result.confidence * 100).toFixed(1)}%)`)
            } else if (result.status === 'no_plate') {
                message.warning(result.message || 'Plat tidak terbaca oleh model.')
            } else {
                message.error(result.message || 'Gagal mendeteksi plat nomor')
            }
        } catch (err) {
            console.error('❌ Error ONNX:', err)
            message.error('Terjadi kesalahan saat deteksi plat.')
        } finally {
            setLoadingOnnx(false)
        }
    }

    // =====================================================
    // UI Render
    // =====================================================
    return (
        <main className="flex-1 flex flex-col bg-gray-50 px-6 py-4 overflow-hidden min-h-0">
            {/*Dashboard Container */}
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
                *Timbangan Info*
            </h2>

            {/* Tabs Container */}
            {/* <div
                className="flex-1 flex flex-col min-h-0 overflow-hidden
                    [&_.ant-tabs]:flex-1
                    [&_.ant-tabs-nav]:mb-0
                    [&_.ant-tabs-nav]:border-b-0
                    [&_.ant-tabs-nav::before]:hidden
                    [&_.ant-tabs-content-holder]:flex-1
                    [&_.ant-tabs-content-holder]:overflow-auto
                    [&_.ant-tabs-content]:flex-1
                    [&_.ant-tabs-tabpane]:flex-1
                    [&_.ant-tabs-tabpane]:overflow-auto"
            >
                <Tabs
                    type="card"
                    size="middle"
                    activeKey={activeKey}
                    onChange={setActiveKey}
                    className="flex-1 flex flex-col bg-transparent"
                    items={items.map((tab) => ({
                        ...tab,
                        children: (
                            <section className="flex-1 flex flex-col bg-white rounded-b-2xl shadow p-6 min-h-0 -mt-4">
                                {tab.children}
                            </section>
                        ),
                    }))}
                />
            </div> */}

            {/* Content TESTING Container */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Deteksi Port COM</h3>
                    <Button type="primary" onClick={fetchPorts}>
                        Refresh Port
                    </Button>
                </div>

                <Table
                    dataSource={ports.map((p, i) => ({ key: i, ...p }))}
                    columns={[
                        { title: 'Path', dataIndex: 'path' },
                        { title: 'Manufacturer', dataIndex: 'manufacturer' },
                        { title: 'Vendor ID', dataIndex: 'vendorId' },
                        { title: 'Product ID', dataIndex: 'productId' },
                        {
                            title: 'Aksi',
                            render: (_, record) => (
                                <Button
                                    size="small"
                                    type="default"
                                    onClick={() => handleOpenPort(record.path)}
                                >
                                    Buka
                                </Button>
                            ),
                        },
                    ]}
                    pagination={false}
                    className="bg-white rounded-lg shadow"
                    size="small"
                />

                {/* Serial Monitor Section */}
                {selectedPort && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-700">
                                Data dari {selectedPort}
                            </h4>
                            <Button
                                size="small"
                                danger
                                onClick={() => {
                                    window.electronAPI.closeSerialPort()
                                    setSelectedPort(null)
                                    message.info('Port ditutup')
                                }}
                            >
                                Tutup Port
                            </Button>
                        </div>

                        <pre className="bg-gray-100 p-2 rounded h-20 overflow-hidden text-lg font-mono text-center text-gray-700">
                            {serialData || 'Menunggu data...'}
                        </pre>
                    </div>
                )}

                {/* =====================================================
                    CCTV SNAPSHOT SECTION
                ===================================================== */}
                <div className="bg-white rounded-lg shadow p-4 mt-2">
                    <h4 className="font-semibold text-gray-700 mb-3">
                        Snapshot CCTV Hikvision
                    </h4>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleFetchCctv}
                        autoComplete="off"
                    >
                        <Form.Item
                            label="Link"
                            name="link"
                            rules={[{ required: true, message: 'Link wajib diisi' }]}
                        >
                            <Input placeholder="http://192.168.1.10/ISAPI/Streaming/channels/102/picture" />
                        </Form.Item>

                        <Form.Item
                            label="Username"
                            name="username"
                            rules={[{ required: true, message: 'Username wajib diisi' }]}
                        >
                            <Input placeholder="admin" />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            name="password"
                            rules={[{ required: true, message: 'Password wajib diisi' }]}
                        >
                            <Input.Password placeholder="••••••••" />
                        </Form.Item>

                        <Form.Item className="mb-0">
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loadingCctv}
                                className="w-full"
                            >
                                Ambil Gambar CCTV
                            </Button>
                        </Form.Item>
                    </Form>

                    {cctvImage && (
                        <div className="mt-4 flex flex-col items-center gap-3">
                            <img
                                src={cctvImage}
                                alt="CCTV Snapshot"
                                className="rounded-lg shadow-md max-h-80 object-contain"
                            />
                            <Button
                                type="dashed"
                                onClick={handleRunOnnxDetection}
                                loading={loadingOnnx}
                            >
                                Jalankan Deteksi Plat Nomor (ONNX)
                            </Button>
                        </div>
                    )}

                    {/* =====================================================
                        HASIL CROP DARI ONNX (TAMBAHAN)
                    ===================================================== */}
                    {onnxResult?.croppedImage && (
                        <div className="mt-6 flex flex-col items-center">
                            <h5 className="font-semibold text-gray-700 mb-2">
                                Hasil Crop Plat Nomor:
                            </h5>
                            <img
                                src={onnxResult.croppedImage}
                                alt="Hasil Crop Plat"
                                className="rounded-lg shadow-md max-h-60 object-contain border border-gray-300"
                            />
                            <p className="text-sm text-gray-600 mt-1">
                                Confidence: {(onnxResult.confidence * 100).toFixed(1)}%
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
