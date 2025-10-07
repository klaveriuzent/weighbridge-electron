import React, { useState, useEffect } from 'react'
import { Tabs, Button, Table, message } from 'antd'
import ReceivedTab from '../pages/tabs/ReceivedTab'
import DeliveryTab from '../pages/tabs/DeliveryTab'
import ExternalTab from '../pages/tabs/ExternalTab'

export default function BodyContent() {
    const [activeKey, setActiveKey] = useState('1')
    const [ports, setPorts] = useState([])
    const [selectedPort, setSelectedPort] = useState(null)
    const [serialData, setSerialData] = useState('')

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
            </div>
        </main>
    )
}
