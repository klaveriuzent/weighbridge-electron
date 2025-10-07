import React, { useState } from 'react'
import { Tabs, Button, Table } from 'antd'
import ReceivedTab from '../pages/tabs/ReceivedTab'
import DeliveryTab from '../pages/tabs/DeliveryTab'
import ExternalTab from '../pages/tabs/ExternalTab'

export default function BodyContent() {
    const [activeKey, setActiveKey] = useState('1')
    const [ports, setPorts] = useState([])

    const items = [
        { label: 'Received', key: '1', children: <ReceivedTab /> },
        { label: 'Delivery', key: '2', children: <DeliveryTab /> },
        { label: 'External', key: '3', children: <ExternalTab /> },
    ]

    const fetchPorts = async () => {
        try {
            const result = await window.electronAPI.listSerialPorts()
            setPorts(result)
        } catch (err) {
            console.error('Gagal ambil COM port:', err)
        }
    }

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
                    ]}
                    pagination={false}
                    className="bg-white rounded-lg shadow"
                    size="small"
                />
            </div>
        </main>
    )
}
