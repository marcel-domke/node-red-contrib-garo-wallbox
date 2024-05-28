# Garo Wallbox integration for Node-RED

A unofficial Node-RED node for receiving real-time data and controlling your Garo Wallbox.

## Usage

### Configuration

- **Name**: Optional name for the node.
- **IP Address**: The IP address of your Garo Wallbox.
- **Interval (s)**: The interval in seconds at which to fetch data from the wallbox. Minimum interval is 10 seconds.

### Inputs

- **msg.payload.mode**: To change the mode of the wallbox. Accepts "ALWAYS_OFF" or "ALWAYS_ON".
- **msg.payload.current_limit**: To change the current limit of the wallbox. Accepts values between 6 and 32.

### Outputs

- **msg.payload**: Contains the fetched data and any results from input commands.
  - **msg.payload.advanced**: The detailed data fetched from the wallbox.
    - **meterinfo**: Data related to meter information.
    - **status**: Data related to the status of the wallbox.
    - **lbconfig**: Data related to load balancing configuration.
  - **msg.payload.energy_total**: The total energy.
  - **msg.payload.current_phase1**: The current for phase 1.
  - **msg.payload.current_phase2**: The current for phase 2.
  - **msg.payload.current_phase3**: The current for phase 3.
  - **msg.payload.current_limit**: The current limit.
  - **msg.payload.mode**: The mode.
  - **msg.payload.result**: The result of the last HTTP POST request.
  - **msg.payload.request**: The details of the last HTTP POST request for debugging purposes.

## Compatibility

Tested with the Garo/PCE GLBPDC-T222FC wallbox with WiFi module and the following firmware versions:
- Version 1.3.6
- Version 1.3.7

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.
