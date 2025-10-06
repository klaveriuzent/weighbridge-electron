import React from "react";
import { Table, Tag } from "antd";

export default function WeightTable() {
    const data = [
        { key: 1, id: "WB001", name: "TBS 1", weight: 2850, status: "OK" },
        { key: 2, id: "WB002", name: "TBS 2", weight: 3050, status: "Warning" },
    ];

    const columns = [
        { title: "ID", dataIndex: "id" },
        { title: "Nama", dataIndex: "name" },
        { title: "Berat (kg)", dataIndex: "weight" },
        {
            title: "Status",
            dataIndex: "status",
            render: (status) =>
                status === "OK" ? (
                    <Tag color="green">OK</Tag>
                ) : (
                    <Tag color="orange">Warning</Tag>
                ),
        },
    ];

    return <Table columns={columns} dataSource={data} pagination={false} />;
}
