import React from "react";
import { Form, Popconfirm, Button, Input, DatePicker, Typography } from "antd";
import {
  ActionsTableWrapper,
  ManageButtonsWrapper,
  StyledTableAnt,
} from "../../styles/managementTableStyles";
import { CreateContracts } from "./CreateContracts/CreateContracts";
import { useGetAllClientsQuery } from "../../store/api/clientsApi";
import { useGetAllPledgesQuery } from "../../store/api/pledgesApi";
import { useGetAllEmployeesQuery } from "../../store/api/employeesApi";
import {
  useDeleteContractMutation,
  useGetAllContractsQuery,
  useGetLessDateContractsQuery,
  useGetMoreDateContractsQuery,
  useUpdateContractMutation,
} from "../../store/api/contractsApi";
import { EditableCell } from "../EditableCell/EditableCell";
import dayjs from "dayjs";

export const ManagementContracts = () => {
  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();

  const [searchValue, setSearchValue] = React.useState("");
  const [payoutToClientLess, setPayoutToClientLess] = React.useState(0);
  const [payoutToClientMore, setPayoutToClientMore] = React.useState(0);

  const [contractsData, setContractsData] = React.useState([]);

  const [startDate, setStartDate] = React.useState(
    dayjs().startOf("month").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")
  );
  const [endDate, setEndDate] = React.useState(
    dayjs().endOf("month").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]")
  );

  const { data: contractsMoreData } = useGetMoreDateContractsQuery({
    payoutToClientMore: payoutToClientMore || 0,
  });

  const { data: contractsLessData } = useGetLessDateContractsQuery({
    payoutToClientLess: payoutToClientLess || 0,
  });

  const { data: contractsBetweenData, refetch: refetchContractsBetweenData } =
    useGetAllContractsQuery({
      startDate,
      endDate,
    });

  const { data: clientsData } = useGetAllClientsQuery();
  const { data: pledgesData } = useGetAllPledgesQuery();
  const { data: employeesData } = useGetAllEmployeesQuery();

  const [updateContract, { isLoading: isUpdateLoading }] =
    useUpdateContractMutation();

  const [deleteContract, { isLoading: isDeleteLoading }] =
    useDeleteContractMutation();

  const [editingKey, setEditingKey] = React.useState("");
  const isEditing = (record) => record.key === editingKey;

  // const edit = (record) => {
  //   form.setFieldsValue({ ...record });
  //   setEditingKey(record.key);
  // };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...contractsBetweenData];
      const index = newData.findIndex((item) => key === item.contract_code);

      if (index > -1) {
        const item = newData[index];
        await updateContract({ contract_code: item.contract_code, data: row });

        setEditingKey("");
        refetchContractsBetweenData();
      } else {
        newData.push(row);
        const item = newData[index];

        await updateContract({ contract_code: item.contract_code, data: row });
        setEditingKey("");
      }
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };

  const handleDelete = async (key) => {
    const dataSource = [...contractsBetweenData];
    const contractToDelete = dataSource.find(
      (item) => item.contract_code === key
    );

    try {
      await deleteContract(contractToDelete.contract_code.toString());
      await refetchContractsBetweenData();
    } catch (error) {
      console.error("Error deleting contract:", error);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleSearch = (value) => {
    setSearchValue(value);
  };

  React.useMemo(() => {
    let filteredContractsData = [];

    if (contractsBetweenData) {
      filteredContractsData = contractsBetweenData;
    }

    if (contractsMoreData && payoutToClientMore !== 0) {
      filteredContractsData = contractsMoreData.filter(
        (contract) => contract.payout_to_client > payoutToClientMore
      );
    }

    if (contractsLessData && payoutToClientLess !== 0) {
      filteredContractsData = contractsLessData.filter(
        (contract) => contract.payout_to_client > payoutToClientLess
      );
    }

    setContractsData(filteredContractsData);
  }, [
    contractsBetweenData,
    contractsMoreData,
    contractsLessData,
    payoutToClientMore,
    payoutToClientLess,
  ]);

  const filteredData = contractsData
    ? contractsData?.filter((contract) => {
        const searchRegex = new RegExp(searchValue, "i");
        return (
          searchRegex.test(contract.contract_code) ||
          searchRegex.test(formatDate(contract.creation_date)) ||
          searchRegex.test(formatDate(contract.termination_date)) ||
          searchRegex.test(formatDate(contract.payment_date)) ||
          searchRegex.test(contract.contract_type) ||
          searchRegex.test(contract.payout_to_client) ||
          (clientsData &&
            searchRegex.test(
              clientsData.find(
                (client) => client.client_code === contract.client_code
              )?.full_name
            )) ||
          (pledgesData &&
            searchRegex.test(
              pledgesData.find(
                (pledge) => pledge.pledge_code === contract.pledge_code
              )?.description
            )) ||
          (employeesData &&
            searchRegex.test(
              employeesData.find(
                (employee) => employee.employee_code === contract.employee_code
              )?.full_name
            ))
        );
      })
    : [];

  const handleBetweenDateContracts = (dates) => {
    setStartDate(dayjs(dates[0]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"));
    setEndDate(dayjs(dates[1]).format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"));
  };

  const columns = [
    {
      title: "ID договора",
      dataIndex: "contract_code",
      width: "8%",
      sorter: (a, b) => {
        const codeA = a.contract_code?.toString() || "";
        const codeB = b.contract_code?.toString() || "";
        return codeA.localeCompare(codeB);
      },
      sortDirections: ["ascend", "descend"],
    },

    {
      title: "Дата создания",
      dataIndex: "creation_date",
      width: "10%",
      editable: true,
      render: (creationDate) => formatDate(creationDate),
      sorter: (a, b) => a.creation_date.localeCompare(b.creation_date),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Дата расторжения",
      dataIndex: "termination_date",
      width: "10%",
      editable: true,
      render: (creationDate) => formatDate(creationDate),
      sorter: (a, b) => a.termination_date.localeCompare(b.termination_date),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Дата платежа",
      dataIndex: "payment_date",
      width: "8%",
      editable: true,
      render: (creationDate) => formatDate(creationDate),
      sorter: (a, b) => a.payment_date.localeCompare(b.payment_date),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Тип договора",
      dataIndex: "contract_type",
      width: "8%",
      editable: true,
      sorter: (a, b) => a.contract_type.localeCompare(b.contract_type),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Платеж клиенту",
      dataIndex: "payout_to_client",
      width: "10%",
      editable: true,
      sorter: (a, b) => a.payout_to_client.localeCompare(b.payout_to_client),
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Клиент",
      dataIndex: "client_code",
      width: "12%",
      editable: true,
      render: (clientCode) => {
        const client = clientsData?.find(
          (emp) => emp.client.client_code === clientCode
        );
        return client.client?.full_name || clientCode;
      },
      sorter: (a, b) => {
        const aClient = clientsData?.find(
          (emp) => emp.client_code === a.client_code
        );
        const bClient = clientsData?.find(
          (emp) => emp.client_code === b.client_code
        );
        return aClient?.full_name?.localeCompare(
          bClient?.full_name || b.client_code
        );
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Предмет залога",
      dataIndex: "pledge_code",
      width: "11%",
      editable: true,
      render: (pledgeCode) => {
        const pledge = pledgesData?.find(
          (emp) => emp.pledge_code === pledgeCode
        );
        return pledge?.description || pledgeCode;
      },
      sorter: (a, b) => {
        const aPledge = pledgesData?.find(
          (emp) => emp.pledge_code === a.pledge_code
        );
        const bPledge = pledgesData?.find(
          (emp) => emp.pledge_code === b.pledge_code
        );
        return (aPledge?.description || a.pledge_code).localeCompare(
          bPledge?.description || b.pledge_code
        );
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Сотрудник",
      dataIndex: "employee_code",
      width: "12%",
      editable: true,
      render: (employeeCode) => {
        const employee = employeesData?.find(
          (emp) => emp.employee_code === employeeCode
        );
        return employee?.full_name || employeeCode;
      },
      sorter: (a, b) => {
        const aEmployee = employeesData?.find(
          (emp) => emp.employee_code === a.employee_code
        );
        const bEmployee = employeesData?.find(
          (emp) => emp.employee_code === b.employee_code
        );
        return (aEmployee?.full_name || a.employee_code).localeCompare(
          bEmployee?.full_name || b.employee_code
        );
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "Действия",
      dataIndex: "operation",
      render: (_, record) => {
        const editable = isEditing(record);

        return editable ? (
          <ActionsTableWrapper>
            <Button
              onClick={() => save(record.key)}
              loading={isUpdateLoading}
              type="primary"
            >
              Сохранить
            </Button>

            <Popconfirm
              title="Уверены что хотите отменить действие?"
              onConfirm={cancel}
            >
              <Button>Отменить</Button>
            </Popconfirm>
          </ActionsTableWrapper>
        ) : (
          <ActionsTableWrapper>
            {/* <Button
              disabled={editingKey !== ""}
              onClick={() => edit(record)}
              type="primary"
            >
              Изменить
            </Button> */}

            <Popconfirm
              title="Уверены что хотите удалить предмет залога?"
              onConfirm={() => handleDelete(record.key)}
            >
              <Button>Удалить</Button>
            </Popconfirm>

            {/* <Button type="primary">
              <Link
                target="_blank"
                to={`http://localhost:3000/uploads/${record.contract_code}.pdf`}
              >
                Экспортировать
              </Link>
            </Button> */}
          </ActionsTableWrapper>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) return col;

    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: "text",
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <>
      <ManageButtonsWrapper>
        <Button loading={isDeleteLoading} onClick={() => setOpen(true)}>
          Добавить договор
        </Button>

        <Input
          placeholder="Найти..."
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200 }}
        />
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <Typography.Text>
          <b>(№6.2) </b>Договоры, где платеж клиенту больше введенного значения
          (условие с больше)
        </Typography.Text>
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <Input
          onChange={(e) => setPayoutToClientMore(e.target.value)}
          style={{ width: "200px" }}
        />
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <Typography.Text>
          <b>(№6.2) </b>Договоры, где платеж клиенту меньше введенного значения
          (условие с меньше)
        </Typography.Text>
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <Input
          onChange={(e) => setPayoutToClientLess(e.target.value)}
          style={{ width: "200px" }}
        />
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <Typography.Text>
          <b>(№6.2) </b>Диапазон договоров по дате (условие с между)
        </Typography.Text>
      </ManageButtonsWrapper>

      <ManageButtonsWrapper>
        <DatePicker.RangePicker onChange={handleBetweenDateContracts} />
      </ManageButtonsWrapper>

      <Form form={form} component={false}>
        <StyledTableAnt
          components={{
            body: {
              cell: EditableCell,
            },
          }}
          bordered
          dataSource={filteredData?.map((contract) => ({
            ...contract,
            key: contract.contract_code,
          }))}
          columns={mergedColumns}
          pagination={false}
        />
      </Form>

      <CreateContracts
        open={open}
        setOpen={setOpen}
        refetchContractsBetweenData={refetchContractsBetweenData}
      />
    </>
  );
};
